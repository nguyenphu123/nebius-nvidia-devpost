# Chain Rescue pilot — walkthrough and review

Open http://127.0.0.1:3000/rescue. Existing planner remains at `/`.

## Implemented

One fictional fryer-outage scenario at branch A affects a batch of karaage portions. B and C have fixed queue, stock, capacity, transport estimates and illustrative transfer costs. The engine ranks feasible whole-batch options by arrival time, then transfer cost; a nearer branch can lose because its queue makes it late. Transport policy is fictional, not safety advice. No real chain, customer or courier is involved.

Nemotron via Nebius extracts proposed fields, which require user application. Manual fields work independently. Acceptance checks current remaining capacity server-side, uses an idempotency key, and reserves portions in memory. Workflow transitions enforce accepted → preparing → in_transit → received. Cancellation before dispatch releases reservation; receipt keeps consumed portions unavailable for this demo session.

## Actual walkthrough

1. Typed: “Branch A fryer is down. We need 12 karaage portions in 30 minutes.”
2. Made a live Nebius call and inspected proposed fields before applying.
3. Assessed options: B (0.8 km) takes 43 minutes and is rejected; C (2.1 km) takes 27 minutes, ¥900 transfer cost and has 16 available portions.
4. Clicked Accept without confirmation: application blocked it.
5. Confirmed simulated destination acceptance and transport, then accepted C. Twelve portions reserved.
6. Advanced preparation, pickup and receipt. Event trail displayed all four stages.

This was an agent-operated usability rehearsal, not a study with restaurant staff. Recorded frames are genuine browser screenshots at interaction steps, with edited reading time. MP4 is a sampled walkthrough, not continuous video or real elapsed delivery time. No delivery occurred; steps were advanced seconds apart in simulation.

## Assessment

Strong: the reason to reject the nearest branch is immediately understandable. Decision logic, user confirmation and reservation are more substantive than a nearest-location lookup. The blocked acceptance test visibly demonstrates a guardrail.

Weak: AI only extracts four facts in this pilot. Inputs can be entered manually just as easily for this small case; no measured AI productivity benefit. A 3-minute margin is fragile. Queue/travel are constants, capacity is a simple portion count rather than a time-based kitchen schedule. The deadline is relative to assessment, not continuously decremented.

Critical next steps before real use: authenticated branch-specific acceptance, durable transactions and job recovery after refresh/restart, freshness timestamps and expiration of proposals, verified policies and transport conditions, coordinated pickup/arrival, and per-order deadlines. Receiving does not replenish ingredient stock or automatically release staffing capacity. Reload loses the local job view, while server reservations remain until restart. Do not use this for real dispatch.

## Validation and recording handoff

27 automated tests passed at implementation, including original planner regressions, nearest-branch rejection, no feasible solution, input validation, idempotency, reservation conflict, cancellation release and transition order. One live AI report succeeded; this is not an accuracy benchmark.

For a continuous recording: use your screen recorder to capture only the Chain Rescue browser window, follow steps 1–6 above, and label the sandbox and any edited waits. Keep credentials and other tabs out of frame. Record the no-feasible-option branch too (e.g. 10-minute deadline). The current MP4 is useful to review the flow but is not presented as final continuous competition footage.
