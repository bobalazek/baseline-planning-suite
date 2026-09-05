# Overview

## What this is

A delivery organisation sells its people's time. Baseline answers, month by month: who is assigned
to what, whether anyone is committed beyond their contracted hours, and what the plan costs at the
rates those people are paid.

Two facts make that awkward, and they are the whole exercise:

1. **A person's cost rate changes over time**, so one month can be priced at two rates — or three.
2. **The same people are shared across projects**, so capacity only means something when every
   project is counted together.

The register of people and their rates, and the plan that spends them, are owned by different teams
on different release schedules. So this is three applications, not one.

## The shape of it

```text
                    ┌──────────────────────┐
                    │        Shell         │  navigation, display currency, active user
                    │  constructs the one  │  registers remotes from /config.json at runtime
                    │    PlatformHost      │
                    └──────────┬───────────┘
              register(host)   │   register(host)
              ┌────────────────┴────────────────┐
              ▼                                 ▼
      ┌───────────────┐                 ┌────────────────┐
      │    People     │                 │    Delivery    │
      │ employees +   │                 │ projects, WBS, │
      │ rate history  │                 │  allocations   │
      └───────┬───────┘                 └───────┬────────┘
              │  publishes people/directory:            │  publishes delivery/utilisation:
              │  a blended €/h per person per month      │  person-months across every project
              └──────────────► registry ◄───────────────┘
                     bus: rates-changed, allocations-changed
              ▼                                 ▼
      ┌───────────────┐                 ┌────────────────┐
      │  people-api   │                 │  delivery-api  │
      │  own volume   │                 │  own volume    │
      └───────────────┘                 └────────────────┘
```

Neither remote imports the other's source. They meet only at a published contract, handed to them
by the shell at runtime. `apps/acceptance/src/__tests__/boundaries.test.ts` fails the build if that
stops being true.

## The one idea worth knowing

An allocation is spread evenly across the working days of its month. So the hours falling in each
rate segment are proportional to that segment's working days, and the whole month collapses to a
single working-day-weighted rate:

```
cost = Σ segmentDays × (hours ÷ monthDays) × segmentRate
     = hours × blendedRate
```

A month therefore has **one number** that fully describes its price, and that number is a pure
function of the rate timeline and the calendar — both of which People owns, and neither of which
depends on anything Delivery owns.

That is why People publishes a *quote* rather than answering a cost request per cell, and it is the
reason the boundary between the two teams sits exactly where it does. Everything else follows.

## Where the work is

Almost all of it is in `packages/`, as pure functions with no React, no DOM and no I/O:

* `people-domain` — effective-dated rates, mid-month splitting, the blended rate, capacity in hours
* `delivery-domain` — the four units, the breakdown tree, roll-ups, cross-project capacity
* `shared-common` — working-day arithmetic and the rounding that makes totals add up

The three frontends choose a project, wire an input and paint a table. The two services are stores
with a REST surface; they own transactions, not rules.
