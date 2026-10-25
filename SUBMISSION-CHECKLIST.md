# Submission readiness — 2026-10-24

Current project: the authenticated Second Serving chain-operations app at http://127.0.0.1:3000/login. The user will record the footage and upload source to GitHub; no publishing or submission was performed by this audit.

## Official competition check

The [Nebius x NVIDIA rules](https://nebiusglobalaihackathon.devpost.com/rules) were checked on 2026-10-24. The deadline is **October 30, 2026 at 10:00 PDT**, equivalent to **October 31 at 02:00 JST**. The user's planned October 25 submission is before that deadline.

The entry needs a functioning build URL, public source with an open-source license, an English demonstration published publicly on YouTube, track selection and tool feedback. Keep the submitted video under three minutes. Suggested track: **Best Apps and Agents**; no track selection has been submitted.

Judging evaluates implementation, design, potential impact and idea quality equally. The earlier YouTube checklist is editorial advice; the three Markdown filenames and a skills demonstration are not separately stated Nebius requirements.

## Status

| Item | Evidence | Remaining work |
| --- | --- | --- |
| Current product entry | Staff login, PostgreSQL operations, retired sandbox redirected | Record at port 3000, not the stale port 3101 tab |
| Runtime AI integration | Final live advice verified through the signed-in UI: 121 words, all four requested sections, approximately 3 seconds | Show the actual provider response in the recording |
| Branch recovery | Guided flow and transaction/permission tests | Branch B needs its actual menu, stock, assets and route configured |
| Source documents | Current scope, PRD, spec and cleaned README | User uploads repository to GitHub |
| Open-source license | No project-level license found | User selects and adds a suitable license when publishing |
| Judge-accessible build | Current server binds loopback | Supply an accessible hosted build or downloadable working test build and setup/test credentials |
| Video | Current English caption plan prepared | User records; add captions, edit and publish final YouTube cut |
| Submission form | Not submitted | Description, track, links and honest tool feedback |

A GitHub repository search under the connected account did not find a matching project; this does not rule out another account or an existing separately named repository. The user has confirmed they will handle the upload.

## Audit findings addressed

- Recoveries reject closed/inactive receiving branches before request or stock-consuming preparation.
- Open-dialog action errors are visible inside the dialog; asynchronous edits are awaited.
- Nebius base URLs with and without a trailing slash resolve to the correct API path.
- The final advice prompt asks for four short plain-text sections for easier reading.
- The main README describes the current authenticated app. Historical planner notes are archived separately.

The automatic approval review previously rejected the isolated preview launcher. Current UI verification uses the actual signed-in app with read-only checks; data-changing invariants are exercised by automated tests. Do not restart a removed demo workflow for the recording.

## Recording preparation

Follow [RECORDING-GUIDE.md](RECORDING-GUIDE.md). In the inspected workspace, all assets—including names containing “B”—are saved under branch A; Branch B has no assigned dishes, assets, stock or approved routes. These records were not reassigned or populated by the audit. Use consistent, clearly described test assumptions when preparing the recording.

Do not claim source quantities, donor eligibility, travel times, delivery or repair that are not shown in the footage. Approval reserves ingredients; preparation consumes them; destination receipt does not receive raw ingredients. Incident resolution is separate from fulfilment.

## Verification record

Final checks passed: **52 application tests and 9 PostgreSQL integration checks**. Coverage includes closed destinations before request/approval/preparation, reservation and consumption rules, rollback, access scope, persistence and the Nebius endpoint path without a trailing slash.

The final app was restarted on port 3000. Admin sign-in and all eight main workspace screens were checked with no visible error notices or captured browser console errors. A live advice request returned the configured NVIDIA Nemotron response in approximately 3 seconds, with 121 words and the four requested labels. UI verification did not submit operational changes.

The old port-3101 tab was a connection-error page; a fresh port-3000 app tab was opened. Earlier automatic review temporarily ran out of capacity; the final edit and test checks subsequently completed through the normal approval path.
