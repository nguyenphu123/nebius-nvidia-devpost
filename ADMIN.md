# Local chain operations

## Start

Requires Node.js 22+ and PostgreSQL. Follow [DATABASE.md](DATABASE.md): quick local start is `npm run dev:local-db`, then `npm run admin:local` in another terminal to choose your first administrator and password (12–200 characters). For an external database use `npm run db:migrate`, `npm run admin:setup` and `npm start`. Existing accounts are not overwritten. Open /login and enter /ops. No default application account is provided.

1. **Branches**: locations, addresses, active flags; operating hours, manager, status, queue minutes, batch capacity and assigned dishes.
2. **Ingredients & stock**: consistent units; receipts, issues for sales/waste, counted-total corrections. Every movement records reason, actor and time. Zero-count corrections work. Used units cannot change.
3. **Menu & recipes**: dishes, JPY price, category, description, allergen notes; per-serving quantities, equipment types, batch prep/packing minutes and transport limit. Zero transport limit disables recovery.
4. **Equipment**: branch assets marked working, broken or maintenance. Type names match recipe requirements (case-normalized).
5. **Overview**: stock-based servings and blockers from branch status, assignment, ingredients, equipment and incident sales pauses.
6. **Incidents**: confirmed reports, optional recovery dish/quantity/customer deadline; AI advice, sales pauses, progress and resolution notes. Equipment reports block that asset until resolved. Stock reports do not alter inventory: record a correction separately.
7. **Prepared-food transfers**: directed approved routes; candidates checked against equipment, stock, capacity, policy and deadline. Recipient requests; donor approves/reserves, prepares/consumes, dispatches; recipient receives. Cancellation before preparation releases holds; prepared ingredients are not refunded. Deadline changes require explicit customer agreement and reason. Receipt does not add raw ingredients.
8. **Team access**: administrators manage accounts and branch assignments. Managers cannot change chain catalogs, routes or accounts. Sessions use current roles/scope; disabled users lose access immediately. Self-disable/demotion is blocked.

## Data and security

Real operational data is stored in PostgreSQL. Existing `data/admin.json` can be imported transactionally into an empty database; it remains untouched as a backup. See [DATABASE.md](DATABASE.md). Existing equipment notes are preserved; structured assets and recipes require explicit setup, not inferred migration.

Back up PostgreSQL securely using database backup tools: it includes password hashes. Mutations use transactions and a database row lock; failed operations do not commit partial deductions. Sessions expire after eight hours and reset on server restart; sessions/rate limits are still process-local. Passwords use salted scrypt; cookies are HttpOnly/SameSite Strict. Protected writes require same-origin JSON. The server binds to loopback and checks Host. No public registration or account recovery.

AI advice sends the selected incident, branch constraints, equipment and recovery comparison to Nebius. It is advisory text only, never executable. Provider failure leaves manual actions available. Do not enter sensitive customer data in incident notes. API keys stay server-side; requests consume provider credits.

## Pilot boundaries

Single-process local implementation, not production ERP/POS. No orders/payments, POS consumption sync, supplier purchasing, lot/expiry/cold-chain tracking, actual courier dispatch, live traffic, settlement, SSO, clustered storage or safety certification. Transport policies and travel times are manager-entered assumptions. Per-item availability is not simultaneous availability across dishes sharing ingredients. Batch capacity releases at dispatch, not through a production schedule.

Legacy /legacy, /rescue and their APIs retain public fictional fixtures, isolated from operations. /admin remains a compatibility catalog editor; use /ops for the complete workflow.

Before external deployment: least-privilege managed database configuration, shared sessions/rate limits, HTTPS/Secure cookies, managed identity/recovery, audit retention, paid-AI rate limits, monitoring, backups and security/food-operations review.

## Verification

`npm test` covers regressions, auth/origin protection, branch scope, disabled sessions, persistence, rollback, eligibility, reservations and transfer transitions. `node demo-operations.mjs` creates a disposable seeded preview on port 3101, separate from real data; Ctrl+C removes its temporary store.
