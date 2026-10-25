import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminStore } from '../admin-store.mjs';
import { stock } from '../operations.mjs';
import {
  SCENARIO_MARKER,
  seedRecordingScenario,
  simulateRecordingRecovery
} from '../database/recording-scenario.mjs';

const actor = {
  id: 'existing-owner',
  username: 'existing-owner',
  role: 'admin',
  active: true,
  branchIds: []
};

function fixture({ branchName = 'Existing branch' } = {}) {
  const initial = {
    version: 1,
    revision: 7,
    users: [{ ...actor, salt: 'existing-private-salt', hash: 'existing-private-hash' }],
    branches: [{
      id: 'existing-branch', name: branchName, address: 'Existing location',
      description: 'Existing user-owned branch, not recording seed data.',
      active: true, dishIds: ['existing-dish'], hours: '09:00–20:00',
      manager: 'Existing manager', status: 'open', queueMinutes: 0, batchCapacity: 10
    }],
    dishes: [{
      id: 'existing-dish', name: 'Existing menu item', price: 500, category: 'Main',
      description: 'Existing user-owned recipe.', allergens: '', active: true,
      recipe: [{ ingredientId: 'existing-ingredient', quantity: 0.1 }],
      requiredEquipment: [], prepMinutes: 5, packMinutes: 1, maxTravelMinutes: 0
    }],
    ingredients: [{
      id: 'existing-ingredient', name: 'Existing ingredient', unit: 'kg',
      description: 'Keep this definition unchanged.', foodType: 'pantry', active: true
    }],
    movements: [{
      id: 'existing-movement', branchId: 'existing-branch', ingredientId: 'existing-ingredient',
      delta: 10, reason: 'Existing opening stock', actor: actor.username,
      at: '2026-10-01T00:00:00.000Z'
    }],
    equipment: [], incidents: [], transfers: [], routes: [], audit: []
  };
  let persisted = structuredClone(initial);
  let commits = 0;
  const store = createAdminStore(initial, async next => {
    persisted = structuredClone(next);
    commits++;
  });
  return {
    initial,
    store,
    get persisted() { return structuredClone(persisted); },
    get commits() { return commits; }
  };
}

test('recording seed adds a labelled ready-to-record scenario without changing existing records or users', async () => {
  const f = fixture();
  const summary = await seedRecordingScenario(f.store, actor);
  const snapshot = await f.store.operations(actor);

  assert.equal(typeof SCENARIO_MARKER, 'string');
  assert.ok(SCENARIO_MARKER.length > 0);
  assert.equal(summary.created, true);
  assert.equal(snapshot.branches.length - f.initial.branches.length, 3);
  assert.equal(snapshot.dishes.length - f.initial.dishes.length, 2);
  assert.equal(snapshot.ingredients.length - f.initial.ingredients.length, 5);
  assert.equal(snapshot.equipment.length, 5);
  assert.equal(snapshot.incidents.length, 0, 'The user should record creating the incident.');
  assert.equal(snapshot.transfers.length, 0, 'A successful delivery must not be pre-created.');

  const ids = Object.values(summary.branches).map(branch => branch.id);
  assert.equal(new Set(ids).size, 3);
  for (const branch of Object.values(summary.branches)) {
    assert.match(branch.name, /DEMO/i);
    assert.ok(snapshot.branches.some(saved => saved.id === branch.id));
  }
  for (const key of ['chicken', 'coating', 'oil', 'rice', 'vegetables']) {
    assert.ok(snapshot.ingredients.some(ingredient => ingredient.id === summary.ingredients[key].id));
  }
  assert.ok(snapshot.dishes.some(dish => dish.id === summary.dish.id));
  const fryer = snapshot.equipment.find(equipment => equipment.id === summary.receivingFryer.id);
  assert.equal(fryer.branchId, summary.branches.receiving.id);
  assert.equal(fryer.status, 'working');
  assert.equal(fryer.type, 'fryer');

  const recipientReadiness = snapshot.readiness.filter(item => item.branchId === summary.branches.receiving.id);
  assert.equal(recipientReadiness.length, 2);
  assert.ok(recipientReadiness.every(item => item.canSell), 'The take should start with both menu items ready.');
  assert.equal(summary.expected.servings, 6);
  assert.equal(summary.expected.deadlineMinutes, 60);
  assert.equal(summary.expected.etaMinutes, 25);
  assert.equal(summary.expected.cost, 650);

  const persisted = f.persisted;
  assert.deepEqual(persisted.users, f.initial.users, 'Existing credentials and branch assignments must remain untouched.');
  for (const collection of ['branches', 'dishes', 'ingredients', 'movements']) {
    for (const existing of f.initial[collection]) {
      assert.deepEqual(persisted[collection].find(item => item.id === existing.id), existing);
    }
  }
  assert.equal(stock(persisted, 'existing-branch', 'existing-ingredient'), 10);
});

test('recording preflight completes a six-serving recovery on a clone without consuming persistent seed stock', async () => {
  const f = fixture();
  const summary = await seedRecordingScenario(f.store, actor);
  const snapshot = await f.store.operations(actor);
  const before = structuredClone(snapshot);
  const persistedBefore = f.persisted;
  const commitCount = f.commits;

  const result = await simulateRecordingRecovery(snapshot, actor, summary);

  assert.equal(result.status, 'received');
  assert.equal(result.etaMinutes, 25);
  assert.equal(result.donorChickenBefore, 8);
  assert.equal(result.donorChickenAfter, 6.8);
  assert.equal(result.recipientChickenBefore, 2);
  assert.equal(result.recipientChickenAfter, 2);
  assert.deepEqual(snapshot, before, 'Simulation must not mutate its supplied snapshot.');
  assert.deepEqual(f.persisted, persistedBefore, 'Simulation must not write to the real store.');
  assert.equal(f.commits, commitCount);
  assert.equal((await f.store.operations(actor)).transfers.length, 0);
});

test('rerunning the seed is a read-only no-op and does not refill stock or repair a used demo asset', async () => {
  const f = fixture();
  const summary = await seedRecordingScenario(f.store, actor);
  await f.store.operate(actor, 'stock.move', {
    branchId: summary.branches.support.id,
    ingredientId: summary.ingredients.chicken.id,
    type: 'issue', quantity: 1, reason: 'Recorded demo consumption; do not automatically refill.'
  });
  const snapshot = await f.store.operations(actor);
  const fryer = snapshot.equipment.find(item => item.id === summary.receivingFryer.id);
  await f.store.operate(actor, 'equipment.save', { ...fryer, status: 'broken' });
  const before = f.persisted;
  const commitCount = f.commits;

  const again = await seedRecordingScenario(f.store, actor);

  assert.equal(again.created, false);
  assert.equal(again.branches.receiving.id, summary.branches.receiving.id);
  assert.equal(again.branches.support.id, summary.branches.support.id);
  assert.equal(again.dish.id, summary.dish.id);
  assert.deepEqual(f.persisted, before);
  assert.equal(f.commits, commitCount, 'A second seed must not create audit entries or stock movements.');
  assert.equal(stock(f.persisted, summary.branches.support.id, summary.ingredients.chicken.id), 7);
  assert.equal(f.persisted.equipment.find(item => item.id === fryer.id).status, 'broken');
});

test('a user-owned branch with the demo name is a collision, not permission to overwrite it', async () => {
  const f = fixture({ branchName: 'DEMO Shinjuku East' });
  const before = f.persisted;

  await assert.rejects(
    async () => seedRecordingScenario(f.store, actor),
    /collision|already|existing|demo|conflict|marker|owned/i
  );

  assert.deepEqual(f.persisted, before);
  assert.equal(f.commits, 0, 'Detect collisions before creating part of the demo scenario.');
});

test('preflight refuses an unavailable donor without mutating the input or saved demo scenario', async () => {
  const f = fixture();
  const summary = await seedRecordingScenario(f.store, actor);
  const snapshot = await f.store.operations(actor);
  snapshot.branches.find(branch => branch.id === summary.branches.support.id).status = 'closed';
  const before = structuredClone(snapshot);
  const persistedBefore = f.persisted;

  await assert.rejects(
    async () => simulateRecordingRecovery(snapshot, actor, summary),
    /unavailable|eligible|closed|support|preflight|cannot/i
  );

  assert.deepEqual(snapshot, before);
  assert.deepEqual(f.persisted, persistedBefore);
});
