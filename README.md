# Baseline Planning Suite

Who is working on what, for how long, and what it costs at the rates those people are paid.

Three federated applications built by two teams that ship independently and never import each
other's source: a **shell** that hosts, a **People** remote that owns the employee register and its
cost-rate history, and a **Delivery** remote that owns the work breakdown and the month-by-month
staffing grid.

> Case study for innoscripta SE — Senior Frontend Engineer. The brief is
> [`docs/innoscripta-task.pdf`](docs/innoscripta-task.pdf); every requirement in it is restated as a
> testable item in [`docs/project/prd.md`](docs/project/prd.md), and the six decisions it leaves
> open are recorded in [`docs/project/decisions/`](docs/project/decisions/).

## Run it

```bash
docker compose up
```

Then open **<http://localhost:8080>**. Nothing else is needed — no Node on the host, no seeding
step, no environment file. The first build takes a few minutes; after that it is seconds.

| URL | What it is |
| --- | --- |
| <http://localhost:8080> | The shell: overview, status, and the fault switch |
| <http://localhost:8080/people> | People, hosted in the shell |
| <http://localhost:8080/delivery> | Delivery, hosted in the shell |
| <http://localhost:8080/side-by-side> | Both at once — where a live rate change is visible |
| <http://localhost:8080/remotes/people/> | People **standalone**, from the same build |
| <http://localhost:8080/remotes/delivery/> | Delivery **standalone**, from the same build |
| <http://localhost:8080/api/people/snapshot> | What People's service owns |
| <http://localhost:8080/api/delivery/snapshot> | What Delivery's service owns |

Edits are written through to the services and survive a reload — and a `docker compose restart`.
`docker compose down -v` drops the two volumes and re-seeds from the fixture.

### Without Docker

```bash
pnpm install
pnpm test        # 254 tests, none of which mount React
pnpm verify      # format, lint, typecheck, test
pnpm dev         # all five apps, shell on http://localhost:5001
```

## The five numbers

The brief says the reference calculation in §3.3 is the first thing checked, so it is asserted
verbatim, from the shipped fixture, through the same code path the running grid uses:

```bash
pnpm --filter @repo/acceptance test
```

A. Okafor, 40 h/week, rates €80.00/h from 2025-01-01 and €95.00/h from 2026-03-12, one leaf cell of
0.50 person-months in March 2026:

| | |
| --- | --- |
| March 2026 working days | **22** |
| Working days before 12 Mar / from 12 Mar on | **8** / **14** |
| One person-month | 40 × 22 ÷ 5 = **176.00 h** |
| This allocation in hours | **88.00 h** |
| Hours per working day | **4.00 h** |
| Cost | 8 × 4 × 80 + 14 × 4 × 95 = **€7,880.00** |
| Same cell in % of capacity | **50.0 %** |
| Implied blended rate | **€89.5455/h** |

To see it on screen: **Delivery → project "Ledger Consolidation" → March 2026**. The cell is
A. Okafor on *Ledger migration › Discovery › Design*. Switch units with the PM / Hours / % / €
toggle; the four readings of that one cell are the four rows above.

## How to break a remote on purpose

The shell's **Overview** page has a switch per remote: *Point at a URL that 404s*. It does not mock
a failure — it re-registers that remote with an entry URL that does not exist, so Module
Federation's real loader really fails and the shell's real recovery path is what you see. The same
thing is a query parameter:

```
http://localhost:8080/?break=people
http://localhost:8080/?break=people,delivery
```

The fault is kept in `sessionStorage`, so it survives a reload and the degraded state can be
inspected properly. What to look at:

* **Break People, open Delivery.** The grid still works in person-months and % of capacity; the
  Hours and € toggles are disabled and say why; every cost reads `—`. Delivery holds no rates and
  does not pretend to.
* **Break Delivery, open People.** The register and the rate editor are untouched; the utilisation
  panel says it is unavailable rather than implying the person is free.
* **Break both.** The shell keeps its navigation, currency selector and status page, and says so in
  place of each panel.

A remote that fails to render (rather than to load) is caught by an error boundary and reported the
same way.

## What to try

1. **A rate change reaches an open cost view with no reload.** Open **Side by side** — both
   applications mounted at once. Put Delivery on *Ledger Consolidation* in **€**, then change Adaeze
   Okafor's 2026-03-12 rate from 95 to 150 in People above it. Her March 2026 cell goes from
   €7,880.00 to €10,960.00 as you tab out of the field, along with every total above it, and the
   page never reloads. (Propagation is in-page, over the shell's bus — a second browser tab is a
   second shell and would need a refresh.)
2. **A month split by a rate change.** March 2026 for A. Okafor is priced at two rates. People shows
   the blend and the `8 + 14` working-day split; Delivery marks the cell and prices it at
   €89.5455/h.
3. **Totals add up.** Switch units and read any column: the rounded cells sum exactly to the rounded
   total beside them, and a work-package row equals the sum of the rows beneath it. Switch currency
   to USD and it still holds — the conversion is applied to the rate, before rounding.
4. **Capacity is cross-project.** Milan Brandt is over capacity in Jun 26 — but only once his other
   project is counted. Delivery flags the cell and names the assignment behind it; People marks him
   oversubscribed in the register. The edit is flagged, never blocked.
5. **Parents are derived.** Add a child work package beneath a leaf that already has allocations.
   The allocations move onto the new child; nothing is silently lost.

## The decisions

The brief leaves five things open and says one of them is what is being assessed. Each is an ADR:

| | Decision | Why, in one line |
| --- | --- | --- |
| [0001](docs/project/decisions/0001-canonical-unit.md) | The canonical unit is the **person-month** | Capacity is defined in it, so R5's check needs nothing from People |
| [0002](docs/project/decisions/0002-rate-cost-boundary.md) | **People publishes a price, not a rate** | Even spreading makes a month cost `hours × blendedRate`, so one number describes it |
| [0003](docs/project/decisions/0003-data-layer-and-persistence.md) | **Two services, two stores** | Ownership becomes physical, not conventional |
| [0004](docs/project/decisions/0004-transport-between-remotes.md) | **The shell owns the platform and injects it** | One instance because one object was constructed, not because a version negotiated |
| [0005](docs/project/decisions/0005-bundler-and-runtime-remotes.md) | **Rspack + MF2, remotes registered at runtime** | The same image runs anywhere; the fault switch is a real 404 |
| [0006](docs/project/decisions/0006-display-rounding.md) | **Leaf cells round, aggregates derive** | Every relationship a reader can check with their eyes is exact |

### The one the brief asks about

> *"Whether Delivery reads rate records and computes cost itself, or asks People for a computed
> cost, is the decision we are assessing."*

**People publishes a month quote; Delivery multiplies its own effort by it.** Rate records never
cross the line — no `hourlyCost`, no `validFrom`, no `RateRecord` anywhere in Delivery, and a test
in `apps/acceptance` fails the build if that ever stops being true.

It works because an allocation is spread evenly over the month's working days, so the hours in each
rate segment are proportional and the whole month collapses to a single working-day-weighted rate:

```
cost = Σ segmentDays × (hours ÷ monthDays) × segmentRate
     = hours × blendedRate
```

A month therefore has *one* number that fully describes its price, and that number is a pure
function of the rate timeline and the calendar — both People's, neither Delivery's. So People
publishes a quote rather than answering a per-cell RPC for each of ~720 cells and every roll-up
above them. The full argument, including what was rejected, is
[ADR-0002](docs/project/decisions/0002-rate-cost-boundary.md).

## Map of the repository

```text
apps/
  shell/            host — navigation, display currency, active user, runtime remote loading
  people/           remote — the register and rate history; publishes a pricing contract
  delivery/         remote — the breakdown and staffing grid; publishes a utilisation contract
  people-api/       owns Employee and RateRecord, and its own volume
  delivery-api/     owns Project, BreakdownItem and Allocation, and its own volume
  acceptance/       test-only; the only workspace allowed to see both domains at once

packages/
  shared-common/    calendar and working-day arithmetic, rounding, the shared vocabulary
  shared-backend/   env, logging, and the DocumentStore persistence port
  platform/         service registry, event bus, session — what a host hands a remote
  people-contracts/     what People publishes: a month quote, and its wire schemas
  delivery-contracts/   what Delivery publishes: utilisation, and its wire schemas
  people-domain/    R1 — effective-dated rates, month splitting, blended rate, capacity
  delivery-domain/  R2–R5 — units, the breakdown tree, roll-ups, cross-project capacity
  tsconfig/ eslint-config/ vitest-config/ rspack-config/   shared tooling

infrastructure/docker/   Dockerfile, nginx for the gateway and the apps, compose stack
fixtures/                the seed file, shipped verbatim
docs/                    the brief, the PRD, and the decisions
```

### Where the domain logic lives

**In `packages/*`, as pure functions, and nowhere else.** Nothing in `people-domain` or
`delivery-domain` imports React, touches the DOM or performs I/O; the 254 tests run in Node. The
apps choose a project, wire an input and paint a table.

The two teams' packages never meet:

* `apps/delivery` and `packages/delivery-*` may import `@repo/people-contracts` — the published
  contract — and nothing else of People's.
* `apps/people` and `packages/people-*` may import `@repo/delivery-contracts`, and nothing else.
* `apps/acceptance` is the single exception, and it ships nothing.

`apps/acceptance/src/__tests__/boundaries.test.ts` enforces all of that against the source, along
with "no `any`", no deep imports, and no dynamic first-party imports.

### How a change in one app reaches the other

The shell constructs exactly one `PlatformHost` and hands it to each remote's `register()`. Each
publishes a contract into its registry and announces changes on its bus, carrying **ids, never
values** — the consumer re-reads through the contract, so the two apps cannot hold divergent copies
of anything.

```
People  ──register(host)──▶  registry: people/directory   ──▶  Delivery reads a price
Delivery ─register(host)──▶  registry: delivery/utilisation ─▶  People reads a load
                    bus: people/rates-changed, delivery/allocations-changed
```

The shell loads **both remotes' headless `./bootstrap` at start-up**, and each `./App` only on
navigation — which is why People can flag over-capacity from Delivery's numbers before Delivery's
screen has ever been opened. `registry.get()` returns `undefined` rather than throwing, so every
consumer is forced by the type to say what it renders when the other team is not there.

## Tests

```bash
pnpm test
```

254 tests. None mount React; none need a browser.

| Where | What it defends |
| --- | --- |
| `packages/shared-common` | Working days, month splitting, largest-remainder rounding (R1, R3) |
| `packages/people-domain` | Effective dating, mid-month splits, blended rate, person-months (R1, R2) |
| `packages/delivery-domain` | Unit conversion and round-tripping, the tree, roll-ups, capacity (R2–R5) |
| `packages/platform` | The registry and bus, including what happens when a contract is missing |
| `apps/*-api` | Every route, through `server.inject()`, against the real fixture |
| `apps/acceptance` | Figure 4 end to end, the fixture's own counts, R3 and R5 over all four projects, and the architecture claims above |

There are no snapshot tests of markup and no browser-driver suite; both would be scaffolding.

## Notes for the walkthrough

* **Depth is not capped at three levels.** The fixture is three deep and every one of its 53 leaves
  is at the third — so a hard cap would make R4 unreachable for every cell in it. The only illegal
  move is one that would put a work package inside its own subtree.
* **Writes are last-write-wins.** There is no optimistic concurrency; with one planner per stack it
  buys nothing and would clutter the contract.
* **Renaming uses `window.prompt`.** The brief forbids a component kit and does not score visual
  polish, so a modal would have been scaffolding.
* **`@repo/rspack-config` is shared by all three frontends.** That is build tooling, in the same
  category as `@repo/tsconfig` — it knows one app hosts and two are hosted, and nothing about what
  either does.
* **The shell's own screen is the status page.** It shows which entries were registered, which
  contracts are published, and the switch that breaks them.
