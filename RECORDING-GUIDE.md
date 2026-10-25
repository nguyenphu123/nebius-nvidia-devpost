# Recording guide — current authenticated app

Prepared 2026-10-24 (Japan). Record the full raw interaction if useful; the submission edit should concentrate on one complete service-recovery story with English overlays and step captions, without voice-over.

## Correct entry point

Start the app with `npm run dev:local-db` and open `http://127.0.0.1:3000/login`. Use the local administrator credentials supplied in chat. Port 3101 and the retired `/demo` path are not the current product workflow.

## Current workspace preparation

The readiness audit found that Branch B has no assigned dishes, stock, equipment or approved routes. All four assets currently belong to branch A, including the assets whose names contain “B”. The recovery engine correctly rejects this as an available source.

Complete these steps yourself before, or during, the raw recording:

1. **Branches → Branch B → Operating settings:** assign the intended dish, ensure the branch is open and set realistic queue/capacity assumptions.
2. **Menu & recipes:** verify ingredient amounts and units. Both current dishes require a fryer and a griller. Their recorded maximum travel time is 3 minutes; review those entries if they were placeholders. Any approved route must fit the intended dish policy.
3. **Equipment → Add equipment:** explicitly choose Branch B and register its required working assets. Renaming branch A's assets will not transfer ownership.
4. **Branch inventory:** select Branch B and receive enough ingredients in each recipe's unit. Use realistic test amounts; on-hand stock at branch A is not shared stock.
5. **Branches → Configure transport route:** set the direction Branch B → branch A, travel estimate, cost and approval. Record consistent scenario assumptions.
6. **Incidents & recovery:** use a relevant open incident at branch A. Older deadlines expire; enter a new customer-agreed deadline in the guided request before comparing sources.

The audit did not perform these operational changes on your behalf.

Two older equipment incidents are already open at branch A. Use the relevant existing report, or handle its previous state before staging a new fault on the same asset; the server rejects duplicate open reports. To demonstrate restored menu readiness, every blocking incident affecting the required equipment must be handled. Prefer clear owner/asset labels in the take: a name containing “B” is still an A-owned asset in the current records.

## Suggested raw recording order

1. Sign in; briefly show the product audience and branch overview.
2. Show branch creation/settings and branch-specific menu assignment.
3. Show a shared menu item, recipe quantities/units and equipment requirements.
4. Show ingredient definitions, then branch inventory and a labelled stock receipt.
5. Show asset ownership and report an equipment fault.
6. Request AI advice and allow the actual response to appear. The app calls Nebius/NVIDIA; record the provider outcome, including an error if it occurs.
7. Choose **Find a support branch**; select dish, servings and deadline; compare the eligible source and any rejected sources.
8. Review and send the request. Show **Requested → Approved → Preparing → On the way → Received**, explaining source/destination responsibilities.
9. Inspect source stock/reservations and transfer timeline. Approval reserves ingredients; preparation consumes them. Receipt does not add raw ingredients at the destination.
10. Show incident resolution separately, with equipment status changed only after confirmed repair. Team access can be a brief optional segment in the raw recording.

## Editing notes

Final pre-recording checks passed 52 application tests and 9 PostgreSQL integration checks. All main workspace screens loaded without visible or captured console errors. A live Nemotron UI request returned four concise sections (121 words, approximately 3 seconds).

- Record at 1080p when available; leave 2–3 seconds after important state changes.
- Use a fresh deadline for the take. Do not refresh midway: the current UI reloads to the first branch's Overview.
- Captions must use the names, quantities and timings actually visible in the footage. Do not reuse the old Yotsuya/23-minute story unless those records are intentionally configured.
- English text overlays should explain the purpose of each action, not repeat every field label. Label sped-up waiting periods.
- Keep browser chrome, credentials, API keys and unrelated windows out of the final edit.

## Submission items outside the recording

The user will upload source to GitHub. The public repository needs a selected open-source license and working setup instructions; provide a working build/test-build URL and the final public YouTube video URL as well. Official requirements and the current deadline are linked in [SUBMISSION-CHECKLIST.md](SUBMISSION-CHECKLIST.md).
