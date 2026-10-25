# Product upgrade — 2026-10-10

## Shipped

- Explicit user-confirmed mapping of local ingredients to the six sample recipe roles, with measured edible kilograms per unit. A mapping preserves the local name and description. No AI substitution or safety judgment is claimed.
- Mapping integrity validation: unknown roles, missing confirmation, stale ingredient signatures, invalid conversions and non-exact kg/g conversion are rejected. Editing ingredient identity or conversion clears confirmation in the editor.
- Contingency reserve of 0–60 minutes; service windows up to 480 minutes. The scheduling constraint subtracts the reserve. Default remains zero to keep the previous sample reproducible.
- Compare current resources, an extra burner, up to 60 extra minutes, and both. Each option is independently calculated and requires a confirmation checkbox before applying. Costs are ingredients only, not the cost of equipment or overtime.
- Browser-local persistence for the last successfully built kitchen. On refresh the server revalidates and recalculates; approvals are deliberately not restored. Unbuilt edits are not saved.
- Removed the demo-specific few-shot from the AI prompt. Added three independent live probes with a reproducible runner.

## Verification

21 automated tests passed. Browser walkthrough verified rejection of an unconfirmed mapping, successful use of a confirmed local ingredient, what-if calculation/application, and restoration after refresh.

Synthetic demo: 140 guests, one burner, no lentils, 240 minutes, 20 minutes reserved:

| Option | Portions | Shortage | Purchases | Finish | Time to service |
|---|---:|---:|---:|---:|---:|
| Current | 70 | 70 | $5.40 | 201 min | 39 min |
| Extra burner | 120 | 20 | $18.90 | 201 min | 39 min |
| Extra 60 minutes | 90 | 50 | $10.20 | 267 min | 33 min |
| Both | 140 | 0 | $28.10 | 237 min | 63 min |

The local-ingredient browser test then added a fictional measured batch: 3 bunches of rau muống at 0.4 edible kg each, manually mapped to the vegetable role for demonstration. All 3 bunches appeared in stock usage. This is a test assumption, not a recommended conversion or verified recipe substitution.

Live model probe results, one attempt per case on 2026-10-10:

- 95 guests, 3 volunteers, $24: exact intended fields only — pass.
- Add 750 g of dry rice to 7 kg: proposed 7.75 kg — pass.
- Add two bags of unknown weight: asked for bag weight, no changes — pass.

These three cases are a smoke test, not an accuracy benchmark or reliability guarantee. No field-user evaluation has occurred.

## Remaining limitations

Three illustrative recipes and fixed timing, price and purchase assumptions remain. User-confirmed mapping cannot establish actual suitability or safety. Use-soon preference is still sample-catalog data rather than per-batch expiry information. No mid-cook replanning, supplier delivery times, equipment cost, persistent chat, account system, deployment or measured real-world impact. Existing demo videos have not been updated.

## Next user validation

Ask a kitchen coordinator to bring one real menu, measured ingredients and a service deadline. Record whether the proposed recipe roles/timing fit their workflow; measure manual versus assisted planning time and all corrections. Do not publish a benefit claim until these observations exist.
