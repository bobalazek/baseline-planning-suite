# Baseline Planning Suite — Product Requirements

> Source: *Baseline Planning Suite — Senior Frontend Engineer case study* (innoscripta SE).
> This document restates the brief as testable requirements and records the decisions the brief
> explicitly delegates. Every requirement carries an ID used in commit messages and test names.

## 1. Problem

A delivery organisation sells its people's time. Somebody has to state, month by month, **who is
assigned to what**, **whether anyone is committed beyond their contracted hours**, and **what the
plan costs at the rates those people are paid**.

Two facts make it awkward:

1. A person's cost rate changes over time, so a single month can be priced at two (or more) rates.
2. The same people are shared across projects, so *capacity* only means something when every
   project is counted together.

The register of people and their rates, and the plan that spends them, are owned by **different
teams on different release schedules**. That is why this is three applications, not one.

## 2. Products

| App | Kind | Owns |
| --- | --- | --- |
| **Shell** | Host | Navigation, display currency, active user. Loads both remotes at runtime and survives their failure. |
| **People** | Remote | Employee register: roles, weekly hours, cost-rate history. Publishes pricing and capacity. |
| **Delivery** | Remote | Work breakdown tree and the month-by-month staffing grid that spends People's rates. |

Neither remote imports the other's source. They meet only at a published contract
(`@baseline/contracts`), handed to them by the shell at runtime.

## 3. Domain model

| Entity | Fields | Notes |
| --- | --- | --- |
| `Employee` | `id, name, role, weeklyHours` | `weeklyHours` ∈ {40, 32, 20} |
| `RateRecord` | `id, employeeId, validFrom, hourlyCost` | No end date — a record runs until the next one starts |
| `Project` | `id, name, startDate, endDate` | Projects overlap and share people |
| `BreakdownItem` | `id, projectId, parentId, name` | `parentId` null at the root; three levels deep |
| `Allocation` | `id, breakdownItemId, employeeId, month, amount` | One canonical unit (see **D1**) |

Fixtures (`fixtures/baseline-seed.json`): 60 employees, 150 rate records (1–4 per person, 10 of
them changing mid-month), 4 overlapping projects, 90 breakdown items three levels deep, 720
allocations. IDs and values are preserved verbatim.

## 4. Domain rules

### R1 — Rates are effective-dated, and months split

* A rate applies from its `validFrom` until the next one begins. The last rate has no end.
* `validFrom` is **inclusive** — the day itself is priced at the new rate.
* An allocation is spread **evenly across the working days of its month**, so every working day
  carries the same effort.
* That month's cost is the working days before the change at the old rate plus the working days
  from the change onward at the new rate. More than one change in a month simply yields more
  than two slices.
* Working days are **Monday to Friday**. Public holidays are ignored entirely.
* An allocation in a month earlier than the employee's first rate record **costs zero, and the
  cell is marked**.

**Consequence used throughout the build.** Because effort is spread evenly, the hours falling in
each slice are `sliceWorkingDays × (hours ÷ monthWorkingDays)`. Therefore

```
cost(month) = hours × Σ(sliceWorkingDays × sliceRate) ÷ monthWorkingDays
            = hours × blendedRate(employee, month)
```

The month's cost is *exactly linear in hours*. This is why the published pricing contract can be a
**rate quote** rather than a per-cell RPC (see **D2**).

### R2 — Four units, one truth

* The grid reads and edits in **hours**, **person-months**, **% of capacity**, or **cost**.
* One canonical unit is stored; the other three are conversions at the edges, never fields.
* `personMonth(employee, month) = weeklyHours × (monthWorkingDays ÷ 5)` — it varies by person and
  by month; it is never a constant.
* `% of capacity` is percent of that person's person-month for that month; 100 % is exactly one
  person-month.
* Editing a cell in **€** in a month containing a rate change divides the entered amount by that
  cell's **blended rate** for the month, giving hours, which convert to the canonical unit.
* Display precision is fixed: hours 2 dp, person-months 2 dp, % 1 dp, cost 2 dp.
* Switching units and switching back must not change the stored value.

**Reference calculation (§3.3 Figure 4).** A. Okafor, 40 h/week; rates €80.00/h from 2025-01-01
and €95.00/h from 2026-03-12; one leaf cell of 0.50 person-months in March 2026:

| Quantity | Expected |
| --- | --- |
| March 2026 working days | 22 |
| Working days before 12 Mar | 8 |
| Working days from 12 Mar on | 14 |
| One person-month | 40 × 22 ÷ 5 = **176.00 h** |
| This allocation in hours | 0.50 × 176 = **88.00 h** |
| Hours per working day | 88 ÷ 22 = **4.00 h** |
| Cost | 8 × 4 × 80 + 14 × 4 × 95 = **€7,880.00** |
| Same cell in % of capacity | **50.0 %** |
| Implied blended rate | **€89.5455/h** |

This is asserted verbatim by `reference-calculation.test.ts`. If it fails, nothing else matters.

### R3 — Totals must add up

Totals are computed from **exact** values and rounded only for display. The displayed total must
equal the sum of the displayed cells: **largest-remainder distribution** so rounded cells add to
the rounded total exactly. The 0.01 tolerance is a floating-point allowance, not a rounding budget.

### R4 — Parents are derived

Effort and cost on a parent come from its children and are read-only. When a child is added
beneath a leaf that carries its own allocations, the leaf's allocations are **moved onto the new
child** (chosen resolution; the alternative — refusing the insertion with a message — is equally
acceptable, silent loss is not).

**On "three levels deep".** The fixture's tree is exactly three levels, and every one of its 53
leaves sits at the third — 51 of them carrying allocations. Treating three as a hard cap would make
R4 unreachable for every cell in the dataset, so depth is read as a description of the shipped plan
rather than an invariant, and inserting beneath a level-three leaf is allowed. The only illegal move
is one that would put a work package inside its own subtree.

### R5 — Capacity is cross-project

Capacity for a month is 100 % of that person's person-month. Allocation is summed across **every**
project, including ones not currently open. When that sum exceeds capacity:

* **People** shows the person as oversubscribed.
* **Delivery** names the assignment that caused it — the most recently edited allocation
  contributing to that person-month.
* The edit is **flagged, never blocked**.

## 5. Functional scope

| ID | Area | Requirement |
| --- | --- | --- |
| F1 | Shell | Navigation between the remotes. |
| F2 | Shell | Owns display currency and the active user, and pushes both into the remotes at runtime. |
| F3 | People | Searchable register. |
| F4 | People | Open an employee and edit rate history — rates addable, correctable and removable, including retroactively. |
| F5 | Delivery | Work breakdown tree with create, rename, move, delete. |
| F6 | Delivery | Staffing grid of people × months; every leaf cell editable. |
| F7 | Across | A rate edited in People reaches any open Delivery cost view **with no reload**. |
| F8 | Across | Over-capacity is flagged in both apps. |
| F9 | Resilience | If a remote fails to load, the shell stays alive and says so in place of that panel. There is a deliberate way to trigger it. |

## 6. Hard constraints (given)

* **No UI libraries** — no component kit, headless primitives, table, grid or tree package.
  Styling tooling and date libraries are permitted.
* **Three federated builds** — shell, people, delivery, wired with Module Federation.
* **Remote URLs resolve at runtime** from container configuration, never from the bundle.
* **Standalone and hosted** — each remote runs both ways from one codebase and one build.
* **One command** — `docker compose up` from a clean clone serves the suite on `localhost:8080`;
  no Node on the host.
* **TypeScript strict** — no `any`.

## 7. Decisions the brief delegates

| ID | Decision | Choice | ADR |
| --- | --- | --- | --- |
| D1 | Canonical unit | **Person-months** | [ADR-0001](decisions/0001-canonical-unit.md) |
| D2 | Rate → cost boundary | **People publishes a pricing quote; Delivery multiplies effort by it** | [ADR-0002](decisions/0002-rate-cost-boundary.md) |
| D3 | Data layer & persistence | **Two domain APIs, each with its own file-backed store behind a repository port** | [ADR-0003](decisions/0003-data-layer-and-persistence.md) |
| D4 | Transport between remotes | **Shell-owned service registry + event bus, injected at runtime** | [ADR-0004](decisions/0004-transport-between-remotes.md) |
| D5 | Bundler & runtime remotes | **Rspack + Module Federation 2, remotes registered from `/config.json`** | [ADR-0005](decisions/0005-bundler-and-runtime-remotes.md) |
| D6 | Display rounding | **Leaf cells are the only rounded values; every aggregate is derived** | [ADR-0006](decisions/0006-display-rounding.md) |

## 8. Out of scope (explicitly not scored)

Visual polish, a design system, auth, mobile, offline, scheduling. The UI is built to be legible
and correct, not decorative.

## 9. Acceptance

1. `docker compose up` from a clean clone serves the suite at `http://localhost:8080`.
2. `pnpm test` proves the reference calculation and every domain rule without mounting React.
3. `pnpm typecheck` passes under `strict` with no `any`.
4. Each remote loads standalone from its own origin and hosted in the shell, from one build.
5. Breaking a remote leaves the shell alive with a message in place of that panel.
