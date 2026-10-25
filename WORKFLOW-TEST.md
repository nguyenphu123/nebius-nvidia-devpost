# Ownership and workflow update

Existing business records were not reassigned, renamed or deleted. An asset named “branch B” that was saved under branch A still belongs to branch A; the UI now explicitly shows that saved ownership. Existing asset ownership cannot be changed through the editor because it would change the meaning of incident history.

## Try these paths

1. **Overview:** select a branch and follow its setup checklist. Each incomplete step links to the editor. Completed checklists collapse. Recipe setup and menu assignment are explicit; merely creating a dish is not enough.
2. **Chain administration → Ingredient catalog:** shared ingredient definitions only. **Branch operations → Branch inventory:** ingredients linked by menu recipes, explicit branch selections or recorded stock. Choose branch ingredients to add more existing definitions. This does not alter stock quantities.
3. **Equipment → Add equipment:** choose the owning branch explicitly. After saving, the workspace switches to that branch and confirms the destination. Asset names never assign ownership.
4. **Equipment → Report a problem:** the branch and asset are preselected. Optionally mark it broken/under maintenance with confirmation in the same save. Existing open incidents have an Open incident action; the backend rejects duplicate open equipment reports.
5. **Incident → Update status:** optionally confirm a repaired asset is working and resolve the report together. Existing unrelated or duplicate legacy incidents are preserved and may still block availability. Finish related transfers before resolving.
6. **Inventory → Receive / Use / waste / Count:** select an amount in the displayed unit, inspect the before/after branch quantity, and supply a reason. Count means setting the actual total, not adding that quantity.

Ingredient transfers have not been added. Incident descriptions are reports, not commands. AI equipment context uses structured owner IDs/names, excluding misleading free-text asset names; advice remains advisory.

## Guided branch support

1. Open **Incidents & recovery → Find a support branch** on an open report. This action is available even if the report was created without recovery details.
2. Choose the receiving branch's dish, enter whole servings and an agreed deadline. Suggested dishes use the affected equipment/ingredient. Confirm the details, then choose **Find available branches**. This adds recovery details to the existing incident; it does not create a duplicate report.
3. Compare eligible branches by total queue + preparation + packing + travel time. The fastest eligible source is highlighted. Expand unavailable branches for specific reasons.
4. Admins can open the source menu, equipment or inventory, configure the directed delivery route, or review dish setup. Source inventory/equipment shortcuts select the support branch in both the page and workspace selector. **Back to branch help** returns to the original receiving branch and rechecks the request.
5. Choose a source → review source, destination, servings, cost and customer deadline → **Send request**. The transfer opens automatically with its next responsible branch and progress shown. Requesting does not reserve stock; source approval reserves it, and preparation consumes it.
6. **Change request** edits servings/dish/deadline before a transfer exists. Once a non-cancelled transfer exists, **View transfer** replaces the request action. Use the transfer's deadline action for an active transfer; resolving an incident still requires handling outstanding transfers.

Current automated verification: 52 application tests and 9 PostgreSQL checks passed. Coverage includes adding recovery to old incidents, ownership/menu checks, explicit confirmation, whole quantities, expired requests, transfer locking, destination closure, transaction rollback and request-through-receipt consumption. Browser verification used the actual signed-in app for read-only setup, navigation and live-advice checks; operational data was not changed during those UI checks.
