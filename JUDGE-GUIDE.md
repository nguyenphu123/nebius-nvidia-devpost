# Second Serving — judge testing guide

Second Serving helps fast-food and takeaway chains manage branch menus, ingredient stock, equipment, and service interruptions. NVIDIA Nemotron provides contextual advice through Nebius Token Factory; application rules check recovery feasibility and people confirm every operational action.

## Access

The submitter must fill in the following details in the Devpost testing instructions after verifying the hosted build:

```text
Application: <verified HTTPS app URL>/login
Username: <dedicated judge-build username>
Password: <dedicated judge-build password>
```

Judges do not need to install software or supply an API key. These placeholders are not working credentials. The hosted build must be running and the actual credentials must be provided in the submission.

If the submitter deploys on Render Free, the first visit after inactivity may show a startup screen for about a minute. Wait for the sign-in page. The database persists independently; a web-service restart requires signing in again.

Source: [GitHub repository](https://github.com/nguyenphu123/nebius-nvidia-devpost)

Recorded product walkthrough: [YouTube video](https://youtu.be/Gy6WMRaRm2E)

## Explore the workspace

Sign in and use **YOUR WORKSPACE** to choose a branch. The sidebar connects:

- **Overview**: menu readiness, open incidents, and active transfers.
- **Branches**: branch operating conditions, assigned menus, and approved directed transport routes.
- **Menu & recipes** and **Ingredient catalog**: shared chain definitions.
- **Branch inventory** and **Equipment**: records owned by the selected branch.
- **Incidents & recovery** and **Prepared-food transfers**: service interruption handling and confirmed support actions.
- **Team access**: administrator and branch-manager permissions.

The judge account has administrator access to this isolated fictional workspace so one reviewer can demonstrate both the source and receiving branches. Branch managers ordinarily operate only their assigned branches.

## A complete recovery walkthrough

The initial hosted fixture uses a fryer failure and **six karaage servings**. It is a reproducible test scenario; the submitted video shows a separate veggie-bowl recording. All `DEMO` records, recipes, timing assumptions, and transfer confirmations are fictional.

1. Select **DEMO Shinjuku East**. In **Overview**, both demo dishes should initially be ready to sell.
2. Open **Equipment**, locate **DEMO East Fryer 01**, and select **Report a problem**.
3. In **What happened?**, enter `DEMO: fryer stopped heating during lunch service. Six karaage servings need support.` Select **Mark broken**, confirm the equipment change and incident facts, and save. You can leave the optional prepared-dish request unset until the next step.
4. Open **Incidents & recovery** and find this incident. **AI advice** requests a live Nemotron response. Advice is a proposal: it does not repair equipment, reserve ingredients, or create a transfer.
5. Select **Find a support branch**. Choose **DEMO Chicken Karaage**, enter **6** servings and **60** minutes from now, confirm the request facts, and select **Find available branches →**. Use a fresh deadline when testing.
6. Review the candidates. **DEMO Yotsuya Kitchen** should qualify at **25 minutes / ¥650** with untouched opening data: 2-minute queue + 8-minute preparation + 3-minute packing + 12-minute travel. The closer **DEMO Akasaka Pickup** cannot provide karaage because it lacks the required menu, ingredients, and fryer.
7. Choose **DEMO Yotsuya Kitchen →**, review **Yotsuya → Shinjuku**, the six servings, and the deadline, then **Send request**. Sending a request does not reserve stock.
8. In **Prepared-food transfers**, confirm each simulated action in order: **Approve & reserve → Start prep & consume stock → Confirm dispatch → Confirm receipt**. Read the confirmation at each step. Preparation consumes ingredients and cannot be cancelled afterward.
9. Verify **Received**. Switch to **DEMO Yotsuya Kitchen → Branch inventory**: chicken on hand changes from **8 to 6.8 kg** after one six-serving transfer. Receiving prepared food does not add raw ingredients to Shinjuku's inventory.

Receiving dishes does not repair the broken fryer or resolve its incident. Those require separate confirmed actions.

## If another reviewer has already used the data

Changes persist; restarting or redeploying does not reset the workspace. Review an existing transfer's history instead of repeating an action that has already happened. For another complete run, finish or cancel outstanding transfers as permitted, verify equipment repair in this fictional scenario, resolve the old incident, and check the source branch's remaining stock before creating a fresh report and deadline. Each six-serving transfer uses 1.2 kg chicken, 0.18 kg coating, and 0.12 l oil at Yotsuya.

An expired promise can be revised only with an explicitly confirmed customer-agreed deadline. A branch blocked by an open equipment incident stays blocked even if its asset status alone is changed.

## AI availability and limits

If Nebius returns a configuration, quota, or provider error, the app shows the failure and manual workflows remain available. No generated response is substituted. The app checks stock, equipment, batch capacity, queue, directed route, travel policy, and deadline independently of the model.

The pilot does not connect to a POS system, real courier tracking, or food-safety certification. The demo does not claim that physical meals were delivered. All transport and handling decisions require the responsible operator's real-world verification.
