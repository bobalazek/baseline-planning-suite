# Delivery plan

Ordered so that the thing the brief checks first — the reference calculation — is provable before
any React exists, and so the repository builds end-to-end at every phase boundary.

| # | Phase | Output | Proves |
| --- | --- | --- | --- |
| 1 | Scaffold | pnpm workspace, strict TS base, PRD + ADRs | Decisions are recorded before code |
| 2 | Shared kernel | `@baseline/calendar`, `@baseline/numeric` | Working-day arithmetic, largest-remainder rounding (R3) |
| 3 | Contracts & platform | `@baseline/contracts`, `@baseline/platform` | The seam between the two teams (ADR-0004) |
| 4 | Domain services | `people-api`, `delivery-api` | Ownership and persistence (ADR-0003) |
| 5 | People domain | rate timeline, month quote, capacity | **Reference calculation (Figure 4)**, R1 |
| 6 | Delivery domain | units, roll-ups, tree ops, over-capacity | R2, R3, R4, R5 |
| 7 | People app | register, search, rate-history editor | F3, F4 |
| 8 | Delivery app | breakdown tree, staffing grid | F5, F6 |
| 9 | Shell | runtime remotes, session, isolation, fault injection | F1, F2, F7, F8, F9 |
| 10 | Containers | six-service compose, gateway, runtime config | `docker compose up` → `localhost:8080` |
| 11 | Handover | README, walkthrough notes, CI | The reviewer can run and break it |

## Test strategy

Tests exist where they would be defended, not everywhere:

* **Heaviest** on `packages/*` and `apps/*/src/domain/*` — pure functions, no React, no DOM. This is
  where the brief says it looks hardest.
* `reference-calculation.test.ts` asserts the five numbers of Figure 4 verbatim against the shipped
  fixture, using the real `emp-001` rate records. It is the canary.
* Property-style checks on the invariants that are easy to state and easy to break: unit
  round-tripping (R2), rounded cells summing to the rounded total (R3), roll-ups reconciling with
  their leaves (R4).
* Contract-boundary tests: Delivery's domain layer compiles and passes with People's contract
  stubbed out, and contains no rate arithmetic (ADR-0002).
* No snapshot tests of markup, and no browser-driver suite. Both would be scaffolding.
