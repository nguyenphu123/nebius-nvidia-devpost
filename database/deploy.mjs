import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createPool, migrateDatabase, openPostgresStore, seedRecordingDemo } from '../postgres-store.mjs';
import { readRuntimeConfig } from '../runtime-config.mjs';

const BOOTSTRAP_LOCK = 736329411;
const DEMO_MARKER = 'recording-demo-v1';

export class HostedSetupError extends Error {}

export function validateHostedEnvironment(env) {
  let origin, database;
  try { origin = new URL(env.PUBLIC_ORIGIN); } catch {}
  if (!origin || origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new HostedSetupError('Set PUBLIC_ORIGIN to the HTTPS origin of the hosted app, without a path or credentials.');
  }
  try { readRuntimeConfig(env); }
  catch { throw new HostedSetupError('Invalid hosted runtime configuration. Check PUBLIC_ORIGIN, HOST and PORT.'); }
  try { database = new URL(env.DATABASE_URL); } catch {}
  if (!database || !['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || database.pathname.length < 2) {
    throw new HostedSetupError('Set DATABASE_URL to the intended hosted PostgreSQL database. No local database fallback is used.');
  }
  if (env.STORAGE_DRIVER && env.STORAGE_DRIVER !== 'postgres') throw new HostedSetupError('Hosted setup requires STORAGE_DRIVER=postgres.');
  if (![undefined, '', 'false', 'true'].includes(env.JUDGE_SEED_DEMO)) throw new HostedSetupError('JUDGE_SEED_DEMO must be true or false.');
  return { seedDemo: env.JUDGE_SEED_DEMO === 'true' };
}

function firstAdministrator(env) {
  const username = env.JUDGE_ADMIN_USERNAME;
  if (typeof username !== 'string' || !username.trim() || username.length > 80) {
    throw new HostedSetupError('A fresh database requires JUDGE_ADMIN_USERNAME with 1–80 characters.');
  }
  const password = env.JUDGE_ADMIN_PASSWORD;
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) {
    throw new HostedSetupError('A fresh database requires JUDGE_ADMIN_PASSWORD with 12–200 characters.');
  }
  return { username, password };
}

// Used only by the hosted startup command, never by an HTTP endpoint.
// Each account/fixture write uses the existing transactional PostgreSQL adapter.
// A completed seed is recorded separately so normal edits never trigger a refill
// or a failed fixture revalidation on a later deployment.
export async function prepareHostedDatabase(env = process.env, dependencies = {}) {
  const config = validateHostedEnvironment(env);
  const makePool = dependencies.createPool ?? createPool;
  const migrate = dependencies.migrateDatabase ?? migrateDatabase;
  const openStore = dependencies.openPostgresStore ?? openPostgresStore;
  const seed = dependencies.seedRecordingDemo ?? seedRecordingDemo;
  let pool, client, store, locked = false;
  try {
    pool = makePool(env.DATABASE_URL);
    await migrate(pool);
    client = await pool.connect();
    await client.query('SELECT pg_advisory_lock($1)', [BOOTSTRAP_LOCK]);
    locked = true;
    await client.query('CREATE TABLE IF NOT EXISTS second_serving.hosted_setup (name text PRIMARY KEY, completed_at timestamptz NOT NULL DEFAULT now())');
    store = await openStore({ pool });
    let administratorCreated = false;
    if (!await store.configured()) {
      const credentials = firstAdministrator(env);
      await store.setup(credentials.username, credentials.password);
      administratorCreated = true;
    }
    let demoSeeded = false;
    if (config.seedDemo) {
      const completed = await client.query('SELECT name FROM second_serving.hosted_setup WHERE name=$1', [DEMO_MARKER]);
      if (!completed.rowCount) {
        const result = await seed(pool);
        // A crash before this marker is safe: the existing additive seeder can
        // recognize its already-committed fixture without changing its records.
        await client.query('INSERT INTO second_serving.hosted_setup(name) VALUES($1) ON CONFLICT DO NOTHING', [DEMO_MARKER]);
        demoSeeded = result.created;
      }
    }
    return { administratorCreated, demoSeeded };
  } catch (error) {
    if (error instanceof HostedSetupError) throw error;
    // PostgreSQL/provider errors may contain credential-bearing connection data.
    throw new HostedSetupError('Hosted database preparation failed. Check PostgreSQL connectivity, migration compatibility and fictional demo setup.');
  } finally {
    try { await store?.close(); } finally {
      try {
        if (locked) await client.query('SELECT pg_advisory_unlock($1)', [BOOTSTRAP_LOCK]);
      } finally {
        client?.release();
        await pool?.end();
      }
    }
  }
}

export async function startHosted() {
  const result = await prepareHostedDatabase();
  console.log(result.administratorCreated ? 'Hosted administrator created. Credentials were not logged.' : 'Existing hosted accounts preserved.');
  console.log(result.demoSeeded ? 'Fictional DEMO data added.' : 'Existing business data preserved.');
  // Setup credentials are unnecessary for the HTTP process after initialization.
  delete process.env.JUDGE_ADMIN_USERNAME;
  delete process.env.JUDGE_ADMIN_PASSWORD;
  const application = await import('../server.mjs');
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    void application.stopServer().catch(() => {
      console.error('Hosted shutdown failed.');
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await startHosted(); }
  catch (error) {
    console.error(error instanceof HostedSetupError ? error.message : 'Hosted startup failed. Check the deployment environment and PostgreSQL status.');
    process.exitCode = 1;
  }
}
