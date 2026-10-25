CREATE TABLE second_serving.store_meta (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  imported_at timestamptz,
  imported_sha256 text
);
INSERT INTO second_serving.store_meta(singleton) VALUES (true);

-- Entity-per-row storage: relational identity / references plus JSONB domain fields.
-- Nested recipes, assigned menus and event timelines remain JSONB in this migration.
CREATE TABLE second_serving.users (
  id text PRIMARY KEY, position bigint NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  username text GENERATED ALWAYS AS (lower(payload->>'username')) STORED NOT NULL UNIQUE,
  role text GENERATED ALWAYS AS (payload->>'role') STORED NOT NULL CHECK (role IN ('admin','manager'))
);
CREATE TABLE second_serving.branches (
  id text PRIMARY KEY, position bigint NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id)
);
CREATE UNIQUE INDEX branch_name ON second_serving.branches(lower(payload->>'name'));
CREATE TABLE second_serving.dishes (
  id text PRIMARY KEY, position bigint NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id)
);
CREATE UNIQUE INDEX dish_name ON second_serving.dishes(lower(payload->>'name'));
CREATE TABLE second_serving.ingredients (
  id text PRIMARY KEY, position bigint NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id)
);
CREATE UNIQUE INDEX ingredient_name ON second_serving.ingredients(lower(payload->>'name'));
CREATE TABLE second_serving.equipment (
  id text PRIMARY KEY, position bigint NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  branch_id text GENERATED ALWAYS AS (payload->>'branchId') STORED NOT NULL REFERENCES second_serving.branches(id)
);
CREATE INDEX equipment_branch ON second_serving.equipment(branch_id);
CREATE TABLE second_serving.movements (
  id text PRIMARY KEY, position bigint NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  branch_id text GENERATED ALWAYS AS (payload->>'branchId') STORED NOT NULL REFERENCES second_serving.branches(id),
  ingredient_id text GENERATED ALWAYS AS (payload->>'ingredientId') STORED NOT NULL REFERENCES second_serving.ingredients(id),
  delta numeric GENERATED ALWAYS AS ((payload->>'delta')::numeric) STORED NOT NULL
);
CREATE INDEX stock_ledger_lookup ON second_serving.movements(branch_id,ingredient_id);
CREATE TABLE second_serving.incidents (
  id text PRIMARY KEY, position bigint NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  branch_id text GENERATED ALWAYS AS (payload->>'branchId') STORED NOT NULL REFERENCES second_serving.branches(id),
  dish_id text GENERATED ALWAYS AS (payload->>'dishId') STORED REFERENCES second_serving.dishes(id),
  status text GENERATED ALWAYS AS (payload->>'status') STORED NOT NULL CHECK(status IN ('open','investigating','resolved'))
);
CREATE INDEX incident_branch_status ON second_serving.incidents(branch_id,status);
CREATE TABLE second_serving.routes (
  id text PRIMARY KEY, position bigint NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  from_branch text GENERATED ALWAYS AS (payload->>'from') STORED NOT NULL REFERENCES second_serving.branches(id),
  to_branch text GENERATED ALWAYS AS (payload->>'to') STORED NOT NULL REFERENCES second_serving.branches(id),
  UNIQUE(from_branch,to_branch), CHECK(from_branch <> to_branch)
);
CREATE TABLE second_serving.transfers (
  id text PRIMARY KEY, position bigint NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  from_branch text GENERATED ALWAYS AS (payload->>'from') STORED NOT NULL REFERENCES second_serving.branches(id),
  to_branch text GENERATED ALWAYS AS (payload->>'to') STORED NOT NULL REFERENCES second_serving.branches(id),
  incident_id text GENERATED ALWAYS AS (payload->>'incidentId') STORED NOT NULL REFERENCES second_serving.incidents(id),
  dish_id text GENERATED ALWAYS AS (payload->>'dishId') STORED NOT NULL REFERENCES second_serving.dishes(id),
  status text GENERATED ALWAYS AS (payload->>'status') STORED NOT NULL CHECK(status IN ('requested','approved','preparing','in_transit','received','cancelled')),
  CHECK(from_branch <> to_branch)
);
CREATE UNIQUE INDEX one_active_transfer_per_incident ON second_serving.transfers(incident_id) WHERE status <> 'cancelled';
CREATE INDEX transfer_source_status ON second_serving.transfers(from_branch,status);
CREATE INDEX transfer_destination_status ON second_serving.transfers(to_branch,status);
CREATE TABLE second_serving.audit (
  id text PRIMARY KEY, position bigint NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id)
);
