# Second Serving — English submission video draft

## Current recording plan — 2026-10-24

The older video and storyboard below are archived context for the community-kitchen prototype. **Do not submit them as the current product demo.** This plan targets the chain-operations app. The suggested 2:30 duration is editorial; recheck current official rules before publishing.

- **0:00–0:12 — Show `/login`, sign in, then open `/ops`.** “Second Serving helps fast-food and takeaway chains manage branch stock, menus, equipment and service interruptions.” Use text overlays and step-by-step English captions; no voice-over is required for the planned edit.
- **0:12–0:35 — Show an incident and branch comparison.** Caption: “The app checks recipe stock, working equipment, queue, capacity, route and customer deadline.” Use the actual branch A / Branch B records and timings in the footage. Explain any rejected source using its displayed reason. Do not reuse the old Yotsuya/23-minute example.
- **0:35–1:15 — Request, approve, prepare, dispatch, receive.** “A manager confirms every step. Approval reserves ingredients; preparation consumes them at the source. Dispatch and receipt are recorded separately. These are prepared dishes, not raw-material transfers.” Show source stock and transfer history.
- **1:15–1:40 — AI boundary.** Show a verified incident advice response from Nebius/NVIDIA and identify its actual model. “AI helps explain the incident; deterministic code checks feasibility and people approve changes.” If not available, state “Live AI integration is not demonstrated in this recording.”
- **1:40–2:05 — How it was built.** Briefly show the specs, shared domain checks, PostgreSQL persistence and test evidence. Caption: “Node.js + PostgreSQL. NVIDIA Nemotron through Nebius Token Factory. Validated operations and human approvals.” The official Nebius rules do not require a skills demonstration; keep this segment focused on implemented technology.
- **2:05–2:30 — Honest close.** “Sign in with the supplied test account to explore the workspace. Next we will test the workflow with chain managers.” Show scope exclusions and intended next validation, not invented savings.

The user will record actual interactions across the features, then the edit will add English captions without voice-over. Label shortened waits and show confirmations. All `/ops` changes persist in PostgreSQL; the interactive sandbox has been removed. Timing/quantity captions must match the user's footage. No new recording or upload has been completed by this document update.

Use [RECORDING-GUIDE.md](RECORDING-GUIDE.md) for the correct port, current Branch B prerequisites and raw recording order. Final verification on 2026-10-24 showed a live Nemotron response in the signed-in UI in approximately 3 seconds: 121 words, with Situation / Next action / Branch support / Confirm before acting labels. No operational changes were submitted during the UI check. This verifies that request, not guaranteed future provider availability.

---

## Archived earlier draft (not current submission)

## Source and required format

Checked against the official rules on 2026-10-09:
https://nebiusglobalaihackathon.devpost.com/rules

- Video should be shorter than three minutes; judges need not watch beyond three minutes.
- Include footage showing the project functioning on its intended device.
- Submission materials must be English or accompanied by English translations.
- Final video must be publicly visible on YouTube and linked in the submission form.
- Do not include third-party trademarks, music or other copyrighted material without permission. This draft uses the app's own visuals, factual integration labels and no music or sponsor logos; review asset rights before publishing.
- Identify the track. Proposed fit: **Best Apps and Agents**. No entry or track selection has been submitted.
- Highlight NVIDIA model usage and Nebius usage. This app makes runtime Token Factory calls; it does not claim Nebius compute deployment.
- The one-minute hardware/modules provision is specifically for Physical AI, not the proposed track.

The rules do not prescribe a scene-by-scene storyboard. Our editorial structure is problem, product demonstration, implementation, outcome and limitations, aligned with the equally weighted implementation, design, impact and idea criteria.

## Current artifact

`second-serving-demo-en.mp4`: 96 seconds, 1280×720, English on-screen copy, no narration or music. Uses real screenshots, including the prior live AI rehearsal, plus deterministic scenario walkthrough captures. It is **not continuous screen footage** and should remain a review draft. Preserve the Vietnamese version separately.

## Storyboard / optional narration

0:00–0:10 — Second Serving is a planning copilot for community kitchens. It turns available food and limited resources into a meal plan people can review. Our proposed track is Best Apps and Agents.

0:10–0:21 — Meet Linh, a fictional kitchen coordinator preparing for 120 guests. She has four volunteers, two burners, four hours, and thirty dollars for additional ingredients.

0:21–0:33 — She enters ingredients and quantities, then reviews meals, purchases and the burner schedule. Under the sample assumptions, the first plan covers all 120 guests with ten dollars and twenty cents in additional purchases.

0:33–0:46 — Before preparation begins, the lentils delivery is cancelled. Twenty more guests are coming, and a burner is unavailable. The new plan covers eighty people. It explicitly identifies sixty uncovered guests and blocks approval.

0:46–0:59 — NVIDIA Nemotron 3 Super interprets natural-language updates through the Nebius Token Factory inference API. It proposes structured changes. The server validates them, and the user must approve their application. The model does not invent the menu or override the planner.

0:59–1:12 — Linh confirms a replacement burner is available before prep starts. With two burners, the planner covers all 140 guests for twenty-eight dollars and ten cents. It finishes at minute 237, leaving only three minutes of slack. That narrow margin still needs human review.

1:12–1:24 — The recipe engine checks stock, purchase limits, budget and the constructed cooking schedule. The coordinator inspects purchases and timing, approves the reviewed plan and exports it. Sixteen automated tests passed in rehearsal.

1:24–1:36 — The aim is to make resource gaps visible before service, not to claim measured food rescue. Today the prototype has three illustrative recipes, limited local-ingredient matching, and no food-safety certification. Next, we would validate the assumptions with a kitchen partner. AI interprets. Code checks. People decide.

## Before final submission

1. Replace still-image walkthrough sections with actual screen-action footage: enter an update, inspect the returned proposal, click Apply, show shortage/blocked approval, recover resources, inspect shopping and export. Keep the full video under three minutes. Label any shortened inference waits or edited cuts.
2. Add an English voice-over if desired. English captions already address language, but voice-over is an editorial preference, not an explicit rule requirement.
3. Verify every shown capability remains reproducible. Do not claim generic recipe generation, measured impact, food safety, mid-cook replanning or a globally optimal schedule.
4. Provide a working demo/test-build URL and a public source repository with an appropriate open-source license, assets and setup instructions. These are submission requirements beyond the video and are not completed by this artifact.
5. Submit honest tool feedback separately: the compatible API enabled runtime inference without hosting model weights; one rehearsal returned an unsupported field and validation blocked it. Stronger prompt formatting helped in the following run; no formal reliability benchmark has been performed.
6. Review rights, rotate any previously exposed API credential, and ensure secrets are excluded from the public repository and footage.
7. Upload the final approved cut publicly to YouTube, then put its URL in Devpost. No uploading, publishing or submission was performed here.
