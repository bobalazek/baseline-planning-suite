# Delivery plan

Ordered so that the thing the brief checks first — the reference calculation — is provable before
any React exists, and so the repository builds end-to-end at every phase boundary.

| # | Phase | Output | Proves |
| --- | --- | --- | --- |
| 1 | Scaffold | pnpm workspace, strict TS base, PRD + ADRs | Decisions are recorded before code |
| 2 | Shared kernel | `@repo/shared-common` | Working-day arithmetic (R1), largest-remainder rounding (R3), the shared vocabulary |
| 3 | Contracts & platform | `@repo/platform`, `@repo/{people,delivery}-contracts` | The seam between the two teams (ADR-0004) |
| 4 | Domain services | `@repo/shared-backend`, `people-api`, `delivery-api` | Ownership and persistence (ADR-0003) |
| 5 | People domain | rate timeline, month quote, capacity | **Reference calculation (Figure 4)**, R1 |
| 6 | Delivery domain | units, roll-ups, tree ops, over-capacity | R2, R3, R4, R5 |
| 7 | People app | register, search, rate-history editor | F3, F4 |
| 8 | Delivery app | breakdown tree, staffing grid | F5, F6 |
| 9 | Shell | runtime remotes, session, isolation, fault injection | F1, F2, F7, F8, F9 |
| 10 | Containers | six-service compose, gateway, runtime config | `docker compose up` → `localhost:8080` |
| 11 | Handover | README, walkthrough notes, CI | The reviewer can run and break it |

## Test strategy

Tests exist where they would be defended, not everywhere:

* **Heaviest** on `packages/*-domain` and `packages/shared-common` — pure functions, no React, no
  DOM. This is where the brief says it looks hardest.
* `reference-calculation.test.ts` asserts the five numbers of Figure 4 verbatim against the shipped
  fixture, using the real `emp-001` rate records. It is the canary.
* Property-style checks on the invariants that are easy to state and easy to break: unit
  round-tripping (R2), rounded cells summing to the rounded total (R3), roll-ups reconciling with
  their leaves (R4).
* Service tests through `server.inject()`, against the real fixture: every route, including the
  refusals (a duplicate rate day, an edit on a derived parent, a move that would cycle).
* Architecture tests in `apps/acceptance/src/__tests__/boundaries.test.ts`, which check the ADRs'
  claims against the source: no `any`, no rate records in Delivery, no cross-team imports, no deep
  imports, no dynamic first-party imports.
* No snapshot tests of markup, and no browser-driver suite. Both would be scaffolding.
