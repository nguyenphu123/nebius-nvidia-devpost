import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareHostedDatabase, validateHostedEnvironment } from '../database/deploy.mjs';

const env = {
  PUBLIC_ORIGIN: 'https://second-serving.example',
  DATABASE_URL: 'postgresql://fixture:fixture-only-password@database.example/fixture',
  STORAGE_DRIVER: 'postgres', JUDGE_ADMIN_USERNAME: 'judge',
  JUDGE_ADMIN_PASSWORD: 'fixture-only-judge-password', JUDGE_SEED_DEMO: 'true'
};

function fixture({ configured = false, seeded = false, seedFailures = 0 } = {}) {
  const calls = { setup: 0, seed: 0, ended: 0, released: 0, locked: false, closed: 0 };
  let marker = false;
  const client = {
    async query(sql) {
      if (sql.startsWith('SELECT pg_advisory_lock(')) calls.locked = true;
      if (sql.startsWith('SELECT pg_advisory_unlock(')) calls.locked = false;
      if (sql.startsWith('SELECT name')) return { rowCount: marker ? 1 : 0 };
      if (sql.startsWith('INSERT INTO second_serving.hosted_setup')) marker = true;
      return { rowCount: 0 };
    },
    release() { calls.released++; }
  };
  const pool = { connect: async () => client, end: async () => { calls.ended++; } };
  const store = {
    configured: async () => configured,
    setup: async (username, password) => {
      assert.equal(username, env.JUDGE_ADMIN_USERNAME);
      assert.equal(password, env.JUDGE_ADMIN_PASSWORD);
      configured = true; calls.setup++;
    },
    close: async () => { calls.closed++; }
  };
  return {
    calls,
    dependencies: {
      createPool: () => pool,
      migrateDatabase: async () => {}, openPostgresStore: async () => store,
      seedRecordingDemo: async () => {
        calls.seed++;
        if (seedFailures-- > 0) throw Error('Fixture transaction failed');
        const created = !seeded; seeded = true; return { created };
      }
    }
  };
}

test('hosted setup requires an explicit HTTPS origin, PostgreSQL URL and seed choice', () => {
  for (const overrides of [
    { PUBLIC_ORIGIN: undefined }, { PUBLIC_ORIGIN: 'http://second-serving.example' },
    { PUBLIC_ORIGIN: 'https://second-serving.example/login' },
    { PUBLIC_ORIGIN: 'https://private:credential@second-serving.example' },
    { DATABASE_URL: undefined }, { DATABASE_URL: 'file:///fixture' },
    { STORAGE_DRIVER: 'json' }, { JUDGE_SEED_DEMO: 'yes' }
  ]) assert.throws(() => validateHostedEnvironment({ ...env, ...overrides }));
  assert.deepEqual(validateHostedEnvironment(env), { seedDemo: true });
});

test('fresh hosted setup creates an admin and fixture once; redeploys preserve edited data and passwords', async () => {
  const { calls, dependencies } = fixture();
  assert.deepEqual(await prepareHostedDatabase(env, dependencies), { administratorCreated: true, demoSeeded: true });
  assert.equal(calls.setup, 1); assert.equal(calls.seed, 1);
  // Missing/changed bootstrap credentials cannot replace an existing account.
  // A later renamed or consumed fixture is never inspected by the seeder.
  dependencies.seedRecordingDemo = async () => { throw Error('A redeploy must not inspect edited fixture records'); };
  assert.deepEqual(await prepareHostedDatabase({ ...env, JUDGE_ADMIN_USERNAME: undefined, JUDGE_ADMIN_PASSWORD: 'changed' }, dependencies), { administratorCreated: false, demoSeeded: false });
  assert.equal(calls.setup, 1); assert.equal(calls.ended, 2); assert.equal(calls.released, 2);
  assert.equal(calls.locked, false); assert.equal(calls.closed, 2);
});

test('a failed fixture seed can retry after admin creation without replacing the password', async () => {
  const { calls, dependencies } = fixture({ seedFailures: 1 });
  await assert.rejects(prepareHostedDatabase(env, dependencies), /Hosted database preparation failed/);
  assert.equal(calls.setup, 1); assert.equal(calls.seed, 1); assert.equal(calls.locked, false);
  assert.deepEqual(await prepareHostedDatabase({ ...env, JUDGE_ADMIN_PASSWORD: undefined }, dependencies), { administratorCreated: false, demoSeeded: true });
  assert.equal(calls.setup, 1); assert.equal(calls.seed, 2); assert.equal(calls.ended, 2);
});

test('seed is opt-in; an existing fixture without a completion marker is recognized safely', async () => {
  const first = fixture({ configured: true });
  assert.deepEqual(await prepareHostedDatabase({ ...env, JUDGE_SEED_DEMO: 'false' }, first.dependencies), { administratorCreated: false, demoSeeded: false });
  assert.equal(first.calls.seed, 0); assert.equal(first.calls.setup, 0);
  const existing = fixture({ configured: true, seeded: true });
  assert.deepEqual(await prepareHostedDatabase(env, existing.dependencies), { administratorCreated: false, demoSeeded: false });
  await prepareHostedDatabase(env, existing.dependencies);
  assert.equal(existing.calls.seed, 1); assert.equal(existing.calls.setup, 0);
});

test('missing fresh credentials and database failures release resources without exposing supplied secrets', async () => {
  const fresh = fixture();
  await assert.rejects(prepareHostedDatabase({ ...env, JUDGE_ADMIN_PASSWORD: 'short' }, fresh.dependencies), /requires JUDGE_ADMIN_PASSWORD/);
  assert.equal(fresh.calls.setup, 0); assert.equal(fresh.calls.seed, 0);
  assert.equal(fresh.calls.locked, false); assert.equal(fresh.calls.ended, 1);
  const failed = fixture();
  failed.dependencies.migrateDatabase = async () => { throw Error(env.DATABASE_URL); };
  await assert.rejects(prepareHostedDatabase(env, failed.dependencies), error => {
    assert.equal(error.message.includes(env.DATABASE_URL), false);
    assert.equal(error.message.includes(env.JUDGE_ADMIN_PASSWORD), false);
    return /Hosted database preparation failed/.test(error.message);
  });
  assert.equal(failed.calls.ended, 1);
});
