# Second Serving — chain operations

Second Serving helps fast-food and takeaway chains see what each branch can sell and recover service when equipment or stock fails. It combines shared menus and recipes with branch-owned inventory, equipment, incidents and prepared-food transfers.

NVIDIA Nemotron supplies incident advice through Nebius Token Factory. Deterministic rules check feasibility and managers confirm changes.

For a Vietnamese walkthrough with the exact English UI labels, see [USER-GUIDE.md](USER-GUIDE.md). It covers branch setup, daily operations, incident advice and the complete prepared-food transfer workflow.

For step-by-step app and PostgreSQL installation, see [SETUP.md](SETUP.md) (Vietnamese). It separates the bundled local database workflow from an external PostgreSQL setup and includes administrator creation, checks, troubleshooting and backup guidance.

## Run locally

Requires Node.js 22+ and npm. PostgreSQL is the default store.

1. Run `npm ci`.
2. Copy `.env.example` to `.env` if you do not already have one.
3. Add `NEBIUS_API_KEY` for live AI advice. Manual workflows also work without a key.
4. Run `npm run dev:local-db`. This starts a persistent local PostgreSQL database and the app.
5. On a fresh installation, run `npm run admin:local` in another terminal to create an administrator.
6. Open [Staff sign-in](http://127.0.0.1:3000/login) and enter the account you created.

No default account is seeded on a fresh install. Existing workspace credentials are supplied separately. The retired `/demo` path redirects to sign-in or the authenticated workspace. Use port **3000** for the current product; port 3101 is not a submission or recording URL.

See [DATABASE.md](DATABASE.md) for an external PostgreSQL server, migrations and legacy data import. User accounts and business data persist between restarts; web sessions are stored in process memory and require sign-in again after restarting the app.

For optional, clearly labelled fictional recording data, see [DEMO-DATA.md](DEMO-DATA.md). The additive seed prepares three branches and a feasible recovery scenario in the normal signed-in workspace; it does not reset existing data or create an interactive sandbox.

## Main workflows

- **Branches:** assign menu items, opening status, queue delay and batch capacity.
- **Menu & recipes:** configure per-serving ingredient quantities, required equipment, preparation/packing time and approved travel limits.
- **Ingredient catalog:** define names, descriptions, units and handling classification.
- **Branch inventory:** receive stock, record use/waste or count corrections, and inspect quantities/reservations/history.
- **Equipment:** explicitly assign an owning branch and track working/broken/maintenance status.
- **Incidents & recovery:** record a problem, request AI advice, and find a support branch using the guided dish → quantity/deadline → branch comparison → request flow.
- **Prepared-food transfers:** request → source approval/reservation → preparation/ingredient consumption → dispatch → destination receipt.
- **Team access:** administrators manage shared settings and users; managers operate assigned branches.

A created dish needs branch assignment and a recipe before readiness can be evaluated. A supporting branch needs its own stock, required working assets, capacity and an approved directed route within the dish's travel limit. Describing a branch in an asset name does not change its saved owner.

## AI integration

The server makes an OpenAI-compatible runtime inference call to Nebius Token Factory using `nvidia/nemotron-3-super-120b-a12b` by default. Configure `NEBIUS_MODEL`, `NEBIUS_BASE_URL` or `PORT` when needed. Keys stay on the server in `.env`; inference uses the configured account's credits.

The model receives incident context, explicit asset ownership, readiness and checked recovery options. It returns advisory text. It cannot approve requests, move stock, repair equipment or dispatch food. Missing provider configuration or an API error is shown honestly.

## Verify

- `npm test`: application, authorization and domain regressions.
- `npm run test:postgres`: disposable real-PostgreSQL tests for transactional writes, competing reservations, rollback, persistence and import.
- [WORKFLOW-TEST.md](WORKFLOW-TEST.md): manual workflows.
- [RECORDING-GUIDE.md](RECORDING-GUIDE.md): the current recording route and preparation checks.

The automated PostgreSQL suite uses a disposable test cluster. Product UI checks should use the intended signed-in workspace. The interactive sandbox is no longer part of the product.

## Scope and submission documents

[scope.md](scope.md), [prd.md](prd.md), [spec.md](spec.md), [SUBMISSION-CHECKLIST.md](SUBMISSION-CHECKLIST.md) and [SUBMISSION-VIDEO-EN.md](SUBMISSION-VIDEO-EN.md) describe the current app.

Source is published at [nguyenphu123/nebius-nvidia-devpost](https://github.com/nguyenphu123/nebius-nvidia-devpost) under the [MIT license](LICENSE). A working build/test-build URL and the public YouTube video link still need to be supplied for submission. This checkout currently runs on loopback; a localhost URL is not judge-accessible from another device.

## Pilot limits

This is a local pilot with one chain per database. There is no POS/supplier integration, raw-ingredient transfer workflow, live courier tracking, lot/expiry tracking, automatic unit conversion or autonomous AI execution. Transport and timing policies are manually supplied planning assumptions. Staff remain responsible for food handling, allergens and actual receipt/dispatch confirmation.

Legacy prototypes remain archived at `/legacy` and `/rescue`; they use separate sample logic and are not the current chain workflow. Their historical notes are in [LEGACY-PLANNER.md](LEGACY-PLANNER.md). Historical MP4s do not demonstrate the current product.

Never publish `.env`, `data/`, local PostgreSQL credentials, or a recording that exposes provider keys. The local trial account must be reviewed before choosing credentials for a public build.
