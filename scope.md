# Second Serving — scope

Updated 2026-10-24. Describes the current chain-operations pilot, not the historical community-kitchen prototype.

## Audience and problem
Managers and operators of small-to-mid-sized fast-food / takeaway chains with shared recipes but different branch stock, equipment and capacity. A listed menu item is not necessarily sellable at every location. The pilot makes this difference visible and supports human-approved prepared-food recovery between branches.

## Included
- Admin-controlled branch, dish, ingredient definitions, recipes, transport routes and staff access.
- Branch-owned stock movements, equipment and incident records; managers restricted to assigned branches.
- Menu readiness derived from recipes, stock, reservations, equipment and incidents.
- Recovery candidates checked against source capability, batch capacity, queue, approved route, dish transport limit and recorded deadline.
- Prepared-food request → approval/reservation → preparation/stock consumption → dispatch → receipt, with event history.
- Optional Nebius/NVIDIA incident advice in the authenticated workspace. Deterministic checks and human actions remain authoritative.
- PostgreSQL persistence for authenticated operations. Demonstrations use a staff account and the regular workspace.

## Excluded / limitations
No POS sales synchronization, procurement, supplier management, ingredient transfers, live courier dispatch, GPS/traffic data, food-temperature monitoring, expiry/batch tracing, payments, autonomous AI execution or measured customer impact. Route/time assumptions are manually configured, not a delivery guarantee. No food-safety certification. Authentication is a local pilot with process-memory sessions; this is not a hardened public multi-tenant SaaS.

Legacy `/legacy` and `/rescue` are historical prototypes, not evidence of integration with the operational database. The current submission should show sign-in at `/login` and the authenticated `/ops` workspace. The interactive sandbox has been removed.
