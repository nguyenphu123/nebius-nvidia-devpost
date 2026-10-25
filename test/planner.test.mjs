import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, ingredients, resolveInventory, validateState, planKitchen } from '../planner.mjs';
import { applyAssistantChanges } from '../assistant-changes.mjs';

function verify(plan) {
  const stock = resolveInventory(plan.state.inventory).available;
  assert.ok(plan.cost <= plan.state.budget + 1e-8);
  assert.ok(plan.finish <= plan.state.minutes);
  for (const item of ingredients) {
    const purchased = plan.shopping.find(i => i.id === item.id)?.quantity || 0;
    assert.ok(plan.used[item.id] <= stock[item.id] + purchased + 1e-8);
    assert.ok(purchased <= item.maxBuy + 1e-8);
  }
  for (let lane = 1; lane <= plan.state.burners; lane++) {
    const jobs = plan.schedule.filter(j => j.burner === lane);
    for (let i = 1; i < jobs.length; i++) assert.ok(jobs[i].start >= jobs[i - 1].end);
  }
  assert.equal(plan.schedule.length * 10, plan.portions);
  assert.equal(plan.meals.reduce((n, m) => n + m.portions, 0), plan.portions);
}
test('sample kitchen covers all 120 guests with a feasible plan', () => {
  const plan = planKitchen(initialState); verify(plan);
  assert.equal(plan.shortage, 0);
  assert.equal(plan.portions, 120);
});
test('lost lentils and burner reduce capacity without invented stock', () => {
  const before = planKitchen(initialState);
  const after = planKitchen({ ...initialState, guests: 140, burners: 1, inventory: initialState.inventory.map(i => i.id === 'lentils' ? { ...i, quantity: 0 } : i) });
  verify(after); assert.equal(after.used.lentils, 0); assert.ok(after.portions < before.portions); assert.ok(after.shortage > 0);
});
test('zero stock and zero budget produce zero portions', () => {
  const plan = planKitchen({ ...initialState, budget: 0, inventory: initialState.inventory.map(i => ({ ...i, quantity: 0 })) });
  verify(plan); assert.equal(plan.portions, 0); assert.equal(plan.shortage, 120);
});
test('additional cooking time can recover service', () => {
  const plan = planKitchen({ ...initialState, minutes: 240, burners: 4 });
  verify(plan); assert.equal(plan.shortage, 0);
});
test('invalid constraints are rejected', () => {
  for (const update of [{ guests: -1 }, { burners: 0 }, { volunteers: 1.5 }, { budget: NaN }, { minutes: 900 }]) assert.throws(() => planKitchen({ ...initialState, ...update }));
});
test('varying resource limits preserve all feasibility invariants', () => {
  for (const burners of [1, 2, 4]) for (const minutes of [30, 90, 180]) for (const budget of [0, 30]) verify(planKitchen({ ...initialState, burners, minutes, budget }));
});

test('local names, optional descriptions and custom units survive planning', () => {
  const extra = { id: 'local-1', name: 'Rau muống', description: 'Rau tươi đã nhặt', quantity: 2.75, unit: 'bó', foodType: 'fresh' };
  const plan = planKitchen({ ...initialState, inventory: [...initialState.inventory, extra] });
  assert.deepEqual(plan.state.inventory.at(-1), extra);
  assert.equal(plan.unplannedIngredients[0].id, extra.id);
  assert.equal(plan.inventoryUsage.at(-1).remainingQuantity, 2.75);
  assert.equal(plan.inventoryUsage.at(-1).usedQuantity, 0);
  verify(plan);
});
test('grams and duplicate compatible rows are combined without losing row identity', () => {
  const inventory = initialState.inventory.filter(i => i.id !== 'rice');
  inventory.push({ id: 'rice-a', name: 'Rice (dry)', description: '', quantity: 250, unit: 'g' });
  inventory.push({ id: 'rice-b', name: 'Rice (dry)', description: '', quantity: 6.75, unit: 'kg' });
  const plan = planKitchen({ ...initialState, inventory });
  assert.equal(resolveInventory(inventory).available.rice, 7);
  assert.equal(plan.portions, planKitchen(initialState).portions);
  assert.ok(Math.abs(plan.inventoryUsage.filter(i => i.ingredientId === 'rice').reduce((sum, i) => sum + i.usedQuantity * i.factor, 0) - Math.min(7, plan.used.rice)) < 1e-8);
  verify(plan);
});
test('renaming or describing a sample row cannot retain a hidden recipe match', () => {
  for (const patch of [{ name: 'Đậu phụ' }, { description: 'Already cooked' }, { unit: 'packs' }, { unit: 'l' }]) {
    const inventory = initialState.inventory.map(i => i.id === 'rice' ? { ...i, ...patch } : i);
    assert.equal(resolveInventory(inventory).available.rice, 0);
    assert.ok(planKitchen({ ...initialState, inventory }).unplannedIngredients.some(i => i.id === 'rice'));
  }
});
test('empty inventory is allowed and keeps all quantities finite', () => {
  const plan = planKitchen({ ...initialState, inventory: [], budget: 0 });
  assert.equal(plan.portions, 0); assert.deepEqual(plan.inventoryUsage, []); verify(plan);
});
test('invalid dynamic inventory is rejected instead of silently discarded', () => {
  const base = initialState.inventory[0];
  for (const patch of [{ name: ' ' }, { quantity: -1 }, { quantity: Infinity }, { quantity: '' }, { unit: ' ' }, { description: 23 }, { id: '../bad' }]) assert.throws(() => validateState({ ...initialState, inventory: [{ ...base, ...patch }] }));
  assert.throws(() => validateState({ ...initialState, inventory: [base, base] }));
  assert.throws(() => validateState({ ...initialState, inventory: { spinach: 12 } }));
});
test('assistant patches local ingredient quantity and preserves all metadata and other rows', () => {
  const state = { ...initialState, inventory: [...initialState.inventory, { id: 'tofu', name: 'Đậu phụ', description: '200 g mỗi miếng', quantity: 12, unit: 'miếng', foodType: 'fresh' }] };
  const next = applyAssistantChanges(state, { inventory: [{ id: 'tofu', quantity: 10 }] }).proposedState;
  assert.deepEqual(next.inventory.at(-1), { ...state.inventory.at(-1), quantity: 10 });
  assert.equal(state.inventory.at(-1).quantity, 12);
  assert.deepEqual(next.inventory.slice(0, -1), state.inventory.slice(0, -1));
});
test('assistant cannot silently add, rename, change units or reference missing rows', () => {
  for (const inventory of [[{ id: 'missing', quantity: 3 }], [{ id: 'rice', quantity: 3, unit: 'g' }], [{ id: 'rice', quantity: -1 }], [{ id: 'rice', quantity: 3 }, { id: 'rice', quantity: 4 }], { rice: 3 }]) assert.throws(() => applyAssistantChanges(initialState, { inventory }));
});

test('food type defaults for older rows and is validated and retained in exports', () => {
  const row = { id: 'custom', name: 'Local food', description: '', quantity: 2, unit: 'kg' };
  assert.equal(validateState({ ...initialState, inventory: [row] }).inventory[0].foodType, 'unknown');
  assert.throws(() => validateState({ ...initialState, inventory: [{ ...row, foodType: 'invalid' }] }));
  for (const foodType of ['fresh', 'regular', 'unknown']) {
    const plan = JSON.parse(JSON.stringify(planKitchen({ ...initialState, inventory: [{ ...row, foodType }] })));
    assert.equal(plan.state.inventory[0].foodType, foodType);
    assert.equal(plan.inventoryUsage[0].foodType, foodType);
  }
});
