# Second Serving — product requirements

## Product promise
Help branch managers answer: What can we sell now? What is blocked? Can another branch fulfil the affected dishes before the customer's deadline?

## Roles and ownership
- Chain administrator owns shared definitions, recipes, routes and access assignments.
- Branch manager owns operational changes for assigned branches: inventory, equipment, incident reporting and transfer decisions.
- Product recordings use a signed-in staff account. An administrator can demonstrate chain setup and daily operations; a branch manager sees assigned branches.

## Implemented journeys / acceptance checks
1. First-time visitor sees the target audience and value before sign-in, then enters `/ops` with an existing staff account. No account creation is needed for a judge given test credentials.
2. Manager sees explicit selected branch, ownership labels, sellability and context-specific setup steps. Shared catalog definitions remain distinct from branch quantities.
3. Inventory changes show units and before/after values; the domain rejects invalid quantities and scope violations.
4. Equipment incident points to an asset in that branch; duplicate open incidents for that asset are rejected. Explicit confirmation links reporting/resolution to equipment status changes.
5. Every open incident offers Find a support branch. A guided flow collects dish, servings and deadline, including on older reports without recovery details. Results highlight the fastest eligible source and explain blocked branches with setup shortcuts. Nearer does not automatically mean eligible.
6. Review and send a branch request, then open its transfer automatically with the next responsible branch shown. Request alone does not consume stock. Approval reserves ingredients; preparation consumes them once. Invalid transitions are rejected. Dispatch and receipt remain human-confirmed.
7. AI advice does not mutate operational records. Advice uses the configured Nebius integration in the authenticated workspace.

## Example recording scenario
At lunch, Shinjuku East's fryer fails with ten karaage servings due in 40 minutes. Shinjuku Station is five minutes away but has a 35-minute queue; its 51-minute estimate fails. Yotsuya Kitchen can prepare, pack and deliver in 23 minutes under the fictional assumptions. The manager requests support, approves at the source, records preparation and dispatch, then confirms receipt at the destination. The fryer still needs repair; order fulfilment does not magically fix it.

## Success measures to validate, not claimed results
Observe whether a first-time tester can sign in, explain branch ownership, identify a feasible source and complete a transfer without assistance. Record time, wrong-branch edits, abandoned forms and misunderstandings. No production adoption, savings or usability improvement percentage has yet been established.
