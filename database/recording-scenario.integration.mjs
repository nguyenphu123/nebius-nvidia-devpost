import test from 'node:test';
import assert from 'node:assert/strict';
import EmbeddedPostgres from 'embedded-postgres';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import net from 'node:net';
import { collections, createPool, migrateDatabase, openPostgresStore, seedRecordingDemo } from '../postgres-store.mjs';

async function freePort() {
  const server = net.createServer();
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const port = server.address().port;
  await new Promise(done => server.close(done));
  return port;
}

// Hashes let preservation assertions cover credential payloads without logging
// their contents if a test fails. All identifiers come from the fixed adapter list.
async function databaseSnapshot(pool) {
  const tables = {};
  for (const table of collections) {
    tables[table] = (await pool.query(`SELECT id, position, md5(payload::text) AS fingerprint FROM second_serving.${table} ORDER BY id`)).rows;
  }
  const meta = (await pool.query('SELECT * FROM second_serving.store_meta WHERE singleton')).rows[0];
  return { tables, meta };
}

function assertExistingRowsUnchanged(before, after) {
  for (const table of collections) {
    const current = new Map(after.tables[table].map(row => [row.id, row]));
    for (const row of before.tables[table]) assert.deepEqual(current.get(row.id), row, `Existing ${table} row changed`);
  }
}

async function administrator(store) {
  await store.setup('recording-owner', 'test-only-recording-password-123');
  return store.verify('recording-owner', 'test-only-recording-password-123');
}

async function existingBusiness(store) {
  const actor = await administrator(store);
  const ingredient = await store.operate(actor, 'ingredient.save', {
    name: 'Existing rice', unit: 'kg', foodType: 'pantry', active: true, description: 'Preserve this existing definition.'
  });
  const dish = await store.save('dishes', {
    name: 'Existing rice bowl', category: 'Existing menu', price: 500, active: true, description: 'Preserve this existing menu.'
  }, actor);
  await store.operate(actor, 'recipe.save', {
    id: dish.id, recipe: [{ ingredientId: ingredient.id, quantity: .1 }], requiredEquipment: [], prepMinutes: 5, packMinutes: 1, maxTravelMinutes: 20
  });
  const east = await store.save('branches', { name: 'Existing East', address: 'Fictional test location', active: true, dishIds: [dish.id] }, actor);
  const west = await store.save('branches', { name: 'Existing West', address: 'Fictional test location', active: true, dishIds: [dish.id] }, actor);
  await store.operate(actor, 'equipment.save', { branchId: east.id, name: 'Existing cooker', type: 'rice-cooker', status: 'working', notes: 'Preserve existing equipment.' });
  await store.operate(actor, 'stock.move', { branchId: west.id, ingredientId: ingredient.id, type: 'receive', quantity: 2, reason: 'Existing opening stock' });
  await store.operate(actor, 'route.save', { from: west.id, to: east.id, minutes: 5, cost: 100, approved: true });
  const incident = await store.operate(actor, 'incident.create', {
    branchId: east.id, type: 'general', description: 'Existing fulfilled request', dishId: dish.id, portions: 6, deadline: 60, confirmed: true
  });
  const transfer = await store.operate(actor, 'transfer.request', { incidentId: incident.id, from: west.id, confirmed: true });
  for (const status of ['approved', 'preparing', 'in_transit', 'received']) await store.operate(actor, 'transfer.advance', { id: transfer.id, status });
  await store.manageUser(actor, { username: 'existing-manager', password: 'test-only-manager-password-456', role: 'manager', active: true, branchIds: [east.id] });
  return actor;
}

test('recording fixture PostgreSQL: additive setup, idempotence, recovery and atomic rollback', { timeout: 120000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'ss-recording-postgres-test-'));
  const port = await freePort();
  const password = randomBytes(24).toString('hex');
  const database = new EmbeddedPostgres({
    databaseDir: join(directory, 'cluster'), user: 'postgres', password, port,
    authMethod: 'scram-sha-256', persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'],
    onLog: () => {}, onError: () => {}
  });
  let started = false;

  async function withDatabase(name, work) {
    await database.createDatabase(name);
    const url = new URL(`postgresql://postgres:${password}@127.0.0.1:${port}/postgres`);
    url.pathname = `/${name}`;
    const pool = createPool(url.href);
    let store;
    try {
      await migrateDatabase(pool);
      store = await openPostgresStore({ pool });
      await work(pool, store);
    } finally {
      await store?.close();
      await pool.end();
    }
  }

  try {
    await database.initialise();
    await database.start();
    started = true;

    await t.test('requires an active stored administrator and leaves absent or disabled admin data untouched', async () => {
      await withDatabase('recording_auth', async (pool, store) => {
        const empty = await databaseSnapshot(pool);
        await assert.rejects(seedRecordingDemo(pool), /administrator/i);
        assert.deepEqual(await databaseSnapshot(pool), empty);

        const actor = await administrator(store);
        // Arrange an inactive historical account in this disposable database.
        await pool.query("UPDATE second_serving.users SET payload=jsonb_set(payload, '{active}', 'false'::jsonb, true) WHERE id=$1", [actor.id]);
        const disabled = await databaseSnapshot(pool);
        await assert.rejects(seedRecordingDemo(pool), /administrator/i);
        assert.deepEqual(await databaseSnapshot(pool), disabled);
      });
    });

    await t.test('adds only demo rows while preserving all existing business and credential payloads', async () => {
      await withDatabase('recording_preserve', async (pool, store) => {
        const actor = await existingBusiness(store);
        const before = await databaseSnapshot(pool);
        const scenario = await seedRecordingDemo(pool);
        const after = await databaseSnapshot(pool);
        assert.equal(scenario.created, true);
        assertExistingRowsUnchanged(before, after);
        assert.deepEqual(after.tables.users, before.tables.users);
        assert.equal(after.tables.branches.length, before.tables.branches.length + 3);
        assert.equal(after.tables.dishes.length, before.tables.dishes.length + 2);
        assert.equal(after.tables.ingredients.length, before.tables.ingredients.length + 5);
        assert.ok(Number(after.meta.revision) > Number(before.meta.revision));
        assert.equal((await store.verify('recording-owner', 'test-only-recording-password-123')).id, actor.id);
        assert.equal(scenario.inMemoryPreflight.status, 'received');
        const snapshot = await store.operations(actor);
        assert.equal(snapshot.stock.find(row => row.branchId === scenario.branches.support.id && row.ingredientId === scenario.ingredients.chicken.id).quantity, 8);
        assert.equal(snapshot.incidents.filter(row => row.branchId === scenario.branches.receiving.id).length, 0);
        assert.equal(snapshot.transfers.filter(row => row.to === scenario.branches.receiving.id).length, 0);
      });
    });

    await t.test('repeat seeding is a no-op before and after demo stock use and equipment changes', async () => {
      await withDatabase('recording_repeat', async (pool, store) => {
        const actor = await administrator(store);
        const first = await seedRecordingDemo(pool);
        const pristine = await databaseSnapshot(pool);
        const repeated = await seedRecordingDemo(pool);
        assert.equal(repeated.created, false);
        assert.equal(repeated.dish.id, first.dish.id);
        assert.deepEqual(repeated.branches, first.branches);
        assert.deepEqual(await databaseSnapshot(pool), pristine);

        await store.operate(actor, 'stock.move', {
          branchId: first.branches.support.id, ingredientId: first.ingredients.chicken.id, type: 'issue', quantity: 1, reason: 'Disposable test use; must not be refilled by seed'
        });
        await store.operate(actor, 'equipment.save', { ...first.receivingFryer, status: 'broken' });
        const changed = await databaseSnapshot(pool);
        assert.equal((await seedRecordingDemo(pool)).created, false);
        assert.deepEqual(await databaseSnapshot(pool), changed);
        const snapshot = await store.operations(actor);
        assert.equal(snapshot.stock.find(row => row.branchId === first.branches.support.id && row.ingredientId === first.ingredients.chicken.id).quantity, 7);
        assert.equal(snapshot.equipment.find(row => row.id === first.receivingFryer.id).status, 'broken');
      });
    });

    await t.test('six servings complete the checked 25-minute transfer and consume source chicken from 8 to 6.8 kg', async () => {
      await withDatabase('recording_transfer', async (pool, store) => {
        const actor = await administrator(store);
        const scenario = await seedRecordingDemo(pool);
        const receiving = scenario.branches.receiving.id, support = scenario.branches.support.id;
        const chickenId = scenario.ingredients.chicken.id;
        const stockRow = (snapshot, branchId, ingredientId = chickenId) => snapshot.stock.find(row => row.branchId === branchId && row.ingredientId === ingredientId);
        const initial = await store.operations(actor);
        assert.equal(initial.incidents.length, 0);
        assert.equal(initial.transfers.length, 0);
        assert.equal(stockRow(initial, support).quantity, 8);
        assert.equal(initial.readiness.find(row => row.branchId === receiving && row.dishId === scenario.dish.id).canSell, true);

        const report = await store.operate(actor, 'incident.create', {
          branchId: receiving, type: 'equipment', targetId: scenario.receivingFryer.id,
          description: 'Disposable demo test: fryer stopped heating', equipmentStatus: 'broken', confirmEquipment: true, confirmed: true
        });
        const fault = await store.operations(actor);
        assert.equal(fault.readiness.find(row => row.branchId === receiving && row.dishId === scenario.dish.id).canSell, false);
        await store.operate(actor, 'incident.recovery', { id: report.id, dishId: scenario.dish.id, portions: 6, deadline: 60, confirmed: true });
        const options = await store.recovery(actor, report.id);
        const choice = options.find(row => row.branchId === support);
        assert.equal(choice.eligible, true);
        assert.equal(choice.eta, 25);
        assert.equal(choice.cost, 650);
        assert.equal(choice.timing.travel, 12);
        assert.equal(choice.transportLimit, 20);
        assert.equal(options.find(row => row.branchId === scenario.branches.nearby.id).eligible, false);

        const transfer = await store.operate(actor, 'transfer.request', { incidentId: report.id, from: support, confirmed: true });
        const requested = await store.operations(actor);
        assert.equal(stockRow(requested, support).quantity, 8);
        assert.equal(stockRow(requested, support).reserved, 0);
        await store.operate(actor, 'transfer.advance', { id: transfer.id, status: 'approved' });
        const approved = await store.operations(actor);
        assert.equal(stockRow(approved, support).quantity, 8);
        assert.equal(stockRow(approved, support).reserved, 1.2);
        await store.operate(actor, 'transfer.advance', { id: transfer.id, status: 'preparing' });
        const preparing = await store.operations(actor);
        assert.equal(stockRow(preparing, support).quantity, 6.8);
        assert.equal(stockRow(preparing, support).reserved, 0);
        assert.equal(stockRow(preparing, support, scenario.ingredients.coating.id).quantity, 1.82);
        assert.equal(stockRow(preparing, support, scenario.ingredients.oil.id).quantity, 2.88);
        for (const status of ['in_transit', 'received']) await store.operate(actor, 'transfer.advance', { id: transfer.id, status });
        const final = await store.operations(actor);
        const completed = final.transfers.find(row => row.id === transfer.id);
        assert.equal(completed.status, 'received');
        assert.deepEqual(completed.events.map(event => event.status), ['requested', 'approved', 'preparing', 'in_transit', 'received']);
        assert.equal(stockRow(final, support).quantity, 6.8);
        assert.equal(stockRow(final, receiving).quantity, stockRow(initial, receiving).quantity);
        assert.equal(final.incidents.find(row => row.id === report.id).status, 'open');
        assert.equal(final.equipment.find(row => row.id === scenario.receivingFryer.id).status, 'broken');
      });
    });

    await t.test('a failure during persistence rolls back all seed rows and revision, then a clean retry succeeds', async () => {
      await withDatabase('recording_rollback', async (pool, store) => {
        await existingBusiness(store);
        const before = await databaseSnapshot(pool);
        await pool.query(`
          CREATE FUNCTION second_serving.reject_recording_movement() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN
            IF (NEW.payload->>'reason') LIKE '%second-serving-recording-v1%' THEN
              RAISE EXCEPTION 'Injected recording movement failure';
            END IF;
            RETURN NEW;
          END;
          $$;
          CREATE TRIGGER reject_recording_movement BEFORE INSERT OR UPDATE ON second_serving.movements
          FOR EACH ROW EXECUTE FUNCTION second_serving.reject_recording_movement();
        `);
        await assert.rejects(seedRecordingDemo(pool), /Injected recording movement failure/);
        assert.deepEqual(await databaseSnapshot(pool), before);
        await pool.query('DROP TRIGGER reject_recording_movement ON second_serving.movements; DROP FUNCTION second_serving.reject_recording_movement();');
        const scenario = await seedRecordingDemo(pool);
        assert.equal(scenario.created, true);
        assertExistingRowsUnchanged(before, await databaseSnapshot(pool));
      });
    });
  } finally {
    if (started) await database.stop();
    const relativeDirectory = relative(resolve(tmpdir()), resolve(directory));
    if (!relativeDirectory || relativeDirectory.startsWith('..') || isAbsolute(relativeDirectory) || !relativeDirectory.startsWith('ss-recording-postgres-test-')) {
      throw Error('Unsafe recording test cleanup path.');
    }
    await rm(directory, { recursive: true, force: true });
  }
});
