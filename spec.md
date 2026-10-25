# Second Serving — implementation specification

## Runtime and routes
Node.js 22+ ESM native HTTP server; vanilla JS/CSS frontend. `server.mjs` serves `/` and `/login` as the public introduction/sign-in page. The retired `/demo` path redirects to `/login` or, for signed-in users, `/ops`. `/ops` and `/api/ops/*` require an authenticated account; `/admin` and `/api/admin/*` require an administrator. The server currently binds loopback and checks Host/Origin; public deployment requires a separately reviewed hosting/authentication configuration.

## Persistence and authorization
`storage.mjs` selects PostgreSQL by default, with no silent JSON fallback. `postgres-store.mjs` uses relational identifiers/foreign keys plus JSONB records; mutations execute in transactions under a store metadata lock and recheck the actor's current access. Migrations live under `database/`. Explicit JSON mode supports isolated local fixtures/tests. Passwords use salted scrypt; session cookies are HttpOnly/SameSite Strict with process-memory sessions and login throttling.

## Domain
`operations.mjs` implements shared validation, readiness, recovery and transfer transitions. Catalog definitions are chain-wide; stock is a sum of branch movement deltas. Reservations reduce available quantities. Branch menu assignment and matching working equipment are required. Approved/preparing transfers are rechecked for availability/capacity and deadline. Preparation consumes the saved recipe quantities; dispatch checks route, destination and remaining time. History is retained. Stock amounts use the ingredient's unit; no automatic unit conversion or lot tracking exists.

`incident.recovery` adds or revises confirmed dish/servings/deadline fields on an existing open incident, validates the receiving branch menu and actor scope, and records an event. A non-cancelled linked transfer prevents replacement. `public/recovery-view.mjs` renders the three-step support flow, incident-specific dish suggestions, ETA breakdowns and setup links. Source setup navigation retains a return link to the receiving incident; transfer creation opens the matching transfer with its next actor shown.

## Product demonstration
The interactive sandbox and its API interception have been removed. `public/operations.js` uses authenticated server APIs for every workspace action. Demonstrations follow the same sign-in, authorization and PostgreSQL persistence as ordinary users. Old sandbox assets and the shared domain module are no longer exposed as public browser routes.

## AI boundary
Authenticated incident advice is requested server-side through the OpenAI-compatible Nebius Token Factory API using NVIDIA Nemotron (`nvidia/nemotron-3-super-120b-a12b`, subject to configured availability). Context includes explicit branch IDs/asset ownership and recovery facts. The model returns advisory text, not executable actions. Provider latency/availability and hallucination remain limitations; live inference needs separate verification before recording.

## Verification and startup
See `README.md`, `DATABASE.md` and `WORKFLOW-TEST.md` for setup and manual workflows. Run `npm test` and `npm run test:postgres`; the latter uses a disposable real PostgreSQL instance. `npm run dev:local-db` runs the local persistent pilot. Do not seed demo data into a real workspace or publish `.env`, `data/`, recordings with credentials, or local database files.
