# ADR-0003 — Two domain APIs, each owning its own file-backed store

**Status:** accepted · **Relates to:** "The data layer", "The persistence mechanism"

## Context

Edits must survive a reload. The brief leaves *how each service gets its data and where it lives*,
and *which store*, to us. The organising idea of the exercise is that People and Delivery are owned
by different teams shipping on different schedules.

## Decision

Two independent HTTP services, one per domain, each with its own store:

| Service | Owns | Store |
| --- | --- | --- |
| `people-api` | `Employee`, `RateRecord` | `/data/people.json` on its own volume |
| `delivery-api` | `Project`, `BreakdownItem`, `Allocation` | `/data/delivery.json` on its own volume |

Each service seeds itself from `fixtures/baseline-seed.json` on first boot, taking only the slice it
owns. Persistence sits behind a `DocumentStore` port (`packages/shared-backend`); the JSON file is
one adapter, and the port needs only a `parse` function, so `zod` does not leak into it.

**The services own transactions, not rules.** Every rule of §3.3 lives in framework-free TypeScript
in `packages/*-domain`, where the brief says it will be read ("calculation logic that runs without
mounting React"). Where an operation has to be atomic — R4's allocation reparenting when a child is
inserted beneath a leaf, and deleting a subtree — the service calls the *same* pure function the
frontend would (`reparentAllocations`, `validateMove`) inside one store update. That is the
distinction worth holding: the service owns the write boundary, not a second copy of the rule.

## Why

1. **Ownership becomes physical, not just conventional.** Two teams, two services, two volumes.
   There is no schema either team could reach into, because there is no shared schema. A reviewer
   can `docker compose stop people-api` and watch exactly the degradation the contract predicts.
2. **Reload survival is not the interesting part — shared truth is.** IndexedDB would satisfy the
   letter of "edits must survive a reload", but a planning suite where two planners cannot see the
   same plan is not the product described in §1. Two browsers hitting the same compose stack see
   the same plan.
3. **A file is the right store at fixture scale.** 60 employees, 150 rates, 720 allocations. A JSON
   document read once into memory and written back under a serialising write queue is honest,
   inspectable during a code walkthrough, and needs no native build in the image. The
   `DocumentStore` port is where SQLite or Postgres would go, and the seam is one file wide.
4. **No Node on the host.** Everything runs in the compose stack.

## Consequences

* Six containers: `gateway`, `shell`, `people`, `delivery`, `people-api`, `delivery-api`. The three
  frontends are separate nginx containers precisely because they are separately deployable.
* Writes are last-write-wins. There is no optimistic concurrency; with a single planner per stack it
  buys nothing and would clutter the contract. Called out here rather than discovered later.
* The frontends hold a hydrated in-memory projection of their own service and serve the published
  contracts synchronously from it. Rendering 720 grid cells cannot afford a promise per cell.

## Alternatives rejected

* **Browser-only (IndexedDB per remote).** Fewer moving parts; "where the data lives" answers as
  "this browser". Rejected on (2).
* **One shared API.** Simplest infrastructure, and the one thing the exercise is testing that it
  would quietly destroy.
