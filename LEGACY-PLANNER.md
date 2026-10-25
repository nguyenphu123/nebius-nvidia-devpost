# Historical community-kitchen planner notes

Archived from the earlier README. These notes describe `/legacy` and `/rescue`, not the authenticated PostgreSQL chain-operations app. The current entry point is `/login` on port 3000. Do not use the historical videos or example outcomes to describe the current submission.

Legacy **Chain Rescue** remains at `/rescue` with fictional fixtures; the original kitchen planner is `/legacy`. Neither reads nor writes operational records. The following describes the older planner:

- Edit guest count, time, burners, volunteers, stock and purchasing budget; build a plan.
- Add or remove ingredients freely. Each row has a local name, optional description, quantity and editable unit (kg, g, l, ml, pieces, packs, or your own unit).
- Choose a food type per row: Fresh / raw food, Regular / pantry food, or Not specified (default for new entries). This classification is preserved in the plan, stock report, assistant quantity edits and JSON export. It does not infer shelf life, storage safety or alter recipe yields.
- Inspect meals, the burner schedule, purchases and stock usage.
- Compare guests, portions, shortages, purchasing cost and finish time against the previous successful plan after rebuilding.
- Reserve 0–60 minutes of contingency inside a 30–480 minute service window. The planner must finish before the reserved time starts.
- Compare the current resources with an extra burner, up to 60 extra minutes, or both. These independent what-if plans do not assume equipment is available: confirm the condition before applying an option.
- Use a local ingredient in the existing recipes by opening **Use in sample recipes**, selecting a recipe role, supplying measured edible kg per unit and confirming suitability. Exact kg/g conversion is enforced. This is a kitchen-lead assumption, not an AI-verified substitution or food-safety determination.
- Apply the sample disruption, or send a natural-language update through Nemotron.
- Review the proposed AI changes, then apply and recalculate.
- Resolve shortages before approving. Export the plan as JSON.

The initial sample can be adjusted to explore capacity limits. The sample disruption uses deterministic changes and is explicitly labeled; the assistant form makes a real Nebius API request. Provider failures are displayed and never replaced with a fake AI response.

## How it works

`planner.mjs` enumerates counts of three recipes, each in batches of ten. It constructs a longest-job-first burner schedule for each combination, checks preparation and packing labor, available stock, capped purchases, cost and service time. The objective prioritizes guest coverage, then use-soon stock, then purchasing cost. Scheduling is heuristic: feasible results are checked, but global scheduling optimality is not guaranteed.

`server.mjs` serves only allowlisted public files on loopback and calls Nemotron using the OpenAI-compatible HTTP API (native fetch; no SDK dependency). The assistant proposes structured edits. Numeric validation and explicit user application precede recalculation. Model text is rendered as text/escaped HTML.

## Limits of this draft

- Three illustrative recipes; no nutritional certification or food-safety determination. Staff verify labels, allergens, cross-contact, portions and handling.
- No dairy ingredients in the recipe definitions; this does not certify the donated ingredients as allergen-free.
- One ten-portion batch per burner/pot. All prep precedes cooking; packing follows cooking. Cooking assumes no dedicated full-time operator. Oil, seasoning, water and cookware are available.
- Prices and purchase caps are samples. Lentils/bread cannot be purchased in the sample; purchases must arrive before prep starts.
- Inventory is a list of independent rows with stable IDs. Local names, descriptions, quantities and custom units survive planning and JSON export. Empty inventory is supported; up to 200 rows, names of 120 characters and descriptions of 300 characters are accepted.
- The recipe engine still has three sample recipes. Exact sample names with empty descriptions and kg/g units match automatically. Local/described ingredients require an explicit confirmed recipe-role mapping and measured conversion. Changing identity, description, unit, food type or conversion clears the UI confirmation; the server rejects stale mapping signatures. Quantities can change without changing the confirmed conversion. Duplicate compatible rows aggregate; stock usage is allocated in row order. Unmapped entries remain visible but are not counted. Recipe timings do not adapt to mapped ingredients: the kitchen lead must verify recipe suitability. There is no automatic local recipe generation or inferred unit weight.
- The assistant can propose quantity changes for any existing row by ID, while preserving its name, description and unit. New ingredients are entered manually. Volume and package counts are never guessed as weights.
- No OCR, live supplier prices, real procurement, or messaging integrations.
- The last successfully built kitchen is saved in localStorage on this browser/origin, including confirmed mappings and time reserve. Refresh revalidates and recalculates it; approval, conversation, what-if results and unbuilt edits are not restored. Storage is not encrypted or synced. Reset sample kitchen replaces the saved kitchen on successful build. Export before resetting to keep a copy. Invalid/unavailable saved data falls back to sample data.
- No authentication or multi-user storage. Keep this local draft on loopback; production deployment requires those features and API rate limits.
- The assistant is single-turn: include the complete intended update each time.

## Next validation

See `DEMO.md` for the Vietnamese 3–4 minute fictional kitchen story, exact live-AI prompts, verified sample outcomes and an explicitly labeled non-AI fallback.

Replace recipe coefficients and labor assumptions with a kitchen partner's data, add purchase lead times, validate dietary restrictions, and measure task completion time and model extraction quality on held-out kitchen updates. Do not present planned kilograms as measured food rescue or sample runs as real-world impact.

Run `node evaluate-assistant.mjs` against the running local server for three live probes outside the demo scenario (multi-field update, exact conversion, ambiguous package weight). These calls consume Nebius credits; results report failures honestly. Unit tests do not measure model reliability. The old demo videos depict the earlier version with zero contingency; they have not been regenerated.

