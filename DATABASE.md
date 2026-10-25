# PostgreSQL storage

PostgreSQL is now the default backend. The app never silently falls back to a JSON file if DATABASE_URL is absent or the database is unavailable. Existing JSON files are not deleted or automatically overwritten.

For a Vietnamese installation walkthrough covering both the app and database, see [SETUP.md](SETUP.md).

## Quick start on this machine (no Docker required)

```powershell
npm ci
npm run dev:local-db
```

This starts a **real PostgreSQL server** bound only to `127.0.0.1:55432`, applies migrations and starts the app on port 3000. It is a development convenience, not an in-memory database. PostgreSQL files persist in `data/postgres/`; randomly generated database credentials live in ignored `data/local-postgres-credentials.json`. Neither the database password nor your Nebius key is printed. Stop with Ctrl+C; do not delete the data directory to restart.

In a second terminal, create the first application administrator yourself:

```powershell
npm run admin:local
```

Keep the first terminal running while doing this. Refresh `/login`; no server restart is required. Database credentials and application-user credentials are different. No default application password is created. The bundled PostgreSQL npm runtime is a **development-only** dependency; production should use a supported external/managed PostgreSQL service and install with `npm ci --omit=dev`.

To import an existing JSON store into a brand-new local database, stop the local runner and run once:

```powershell
npm run dev:local-db -- --import-legacy
```

The target must be empty. Import reads `data/admin.json`, preserves IDs, password salts/hashes and operations, and records a source SHA-256. It never alters the source. Repeated import or a nonempty target is refused. Invalid references roll the whole import back. If there is no JSON file, use the normal start command instead.

## Use your own PostgreSQL

Create a dedicated database and an application role with access to it. Set these values in your existing `.env` without changing the Nebius settings:

```dotenv
STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://app_user:URL_ENCODED_PASSWORD@127.0.0.1:5432/second_serving
```

Use your provider's verified TLS configuration for a remote database; this code does not disable certificate verification. Keep the URL out of Git, screenshots and logs.

```powershell
npm run db:migrate
# Only if importing a legacy store into the empty database:
npm run db:import -- data/admin.json
npm run db:check
# Only if no administrator was imported:
npm run admin:setup
npm start
```

Migrations need schema/DDL privileges. A deployed runtime role can be restricted to USAGE on `second_serving` and SELECT/INSERT/UPDATE on its tables after migrations are applied by an administrator. Do not point development tests or the local runner at a production database.

## Data model and transaction boundaries

Schema: `second_serving`. Tables: `users`, `branches`, `dishes`, `ingredients`, `equipment`, `movements`, `incidents`, `routes`, `transfers`, `audit`, `store_meta`, `schema_migrations`.

Each domain entity has its own row, primary key and JSONB payload. Generated columns supply database-enforced foreign keys for equipment, stock movements, incidents, routes and transfers; unique indexes protect usernames, catalog names, directed routes and non-cancelled transfers per incident. Recipes, menu assignments and event timelines remain nested JSONB, validated by the domain layer. This is a **hybrid relational/JSONB schema**, not a single JSON document and not yet a fully normalized ERP schema.

Every mutation checks fresh data inside a transaction using one checked-out connection. A `store_meta` row lock serializes mutations for this single chain before stock/reservations are read. Only changed/new entity rows are written. A failure rolls back stock, transfer and audit changes together. Authorization for writes is rechecked against current stored roles inside that same transaction. Reads construct all collections in one SQL statement for a consistent snapshot; no long-lived in-process catalog cache is used.

Migration 001 has a recorded checksum, runs atomically and is safe to rerun. Never edit an already applied migration; add a subsequent migration for future changes. The current runner contains migration 001 only and must be extended when adding migration versions.

## Deliberate limitations

- Single chain per database; no multi-tenant isolation.
- Chain-wide mutation locking and full-state reads prioritize correctness and reuse of current rules over high-volume throughput. Large chains will need branch-scoped SQL queries/locks and normalized recipe/assignment tables.
- Login sessions and throttling remain process-local. Accounts are persistent, but sessions expire on server restart; multiple app instances need a shared session/rate-limit store before production deployment.
- Direct manual SQL changes bypass application-level nested-JSON invariants. Use the app APIs; restrict database access.
- The local runtime account owns its dedicated development cluster. It is not a production least-privilege deployment.
- Existing food-safety, POS and real-dispatch limitations are unchanged.

## Backup and recovery

Use PostgreSQL's `pg_dump` against your configured database and securely store the dump; test restoration into a **separate empty database** with `pg_restore`. Back up credentials securely as appropriate. Do not copy an active PostgreSQL data directory as a substitute for a valid backup. Importing JSON is a one-way bootstrap, not continuous synchronization or an automatic rollback mechanism. Preserve the original JSON backup until migration is verified.

Legacy JSON mode is retained explicitly for regression tests and the isolated old demo: `STORAGE_DRIVER=json`. It does not synchronize with PostgreSQL. Never switch back expecting new PostgreSQL records to appear in JSON.

## Verification

```powershell
npm test
npm run test:postgres
```

The PostgreSQL suite starts its own disposable cluster on a free loopback port, verifies migrations, independently connected competing writers, rollback, preparation consumption, fresh role checks, authenticated HTTP operations, database restart persistence and transactional JSON import. It never uses DATABASE_URL from your environment and cleans up only its own test directory.

Implementation references: [node-postgres transaction requirements](https://node-postgres.com/features/transactions), [PostgreSQL row locking](https://www.postgresql.org/docs/17/explicit-locking.html).
