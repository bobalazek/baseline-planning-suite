# Packages

## Dependency graph

Arrows point from a package to what it may depend on. Nothing else is allowed, and
`apps/acceptance/src/__tests__/boundaries.test.ts` enforces the two rules that matter.

```text
                          @repo/shared-common          (zero @repo deps, browser-safe)
                         ↑        ↑            ↑
        @repo/platform ──┘        │            └── @repo/shared-backend   (Node only)
              ↑                   │                        ↑
     ┌────────┴────────┐          │                        │
     │                 │          │                        │
@repo/people-      @repo/delivery-│                        │
  contracts          contracts    │                        │
     ↑                 ↑          │                        │
     │                 │          │                        │
@repo/people-      @repo/delivery-┘                        │
  domain             domain                                │
     ↑                 ↑                                   │
  apps/people      apps/delivery                    apps/*-api
              ↖    apps/shell    ↗
                 apps/acceptance   (test-only; may see both sides)
```

**The two rules.**

1. `apps/delivery` and `packages/delivery-*` may import `@repo/people-contracts` and nothing else of
   People's. The reverse holds for People.
2. `@repo/shared-common` has no `@repo/*` dependencies and stays browser-safe, so both teams can
   share a vocabulary without sharing an implementation.

## What each package is for

| Package | Owns | Depends on |
| --- | --- | --- |
| `shared-common` | Working-day arithmetic (R1), display rounding including largest remainder (R3), the five entities, branded ids, the four display units | — |
| `shared-backend` | The only reader of `process.env`, the logger, and the `DocumentStore` persistence port with its JSON-file adapter | `shared-common` |
| `platform` | `ContractKey`, the service registry, the typed event bus, the shell-owned session, and `PlatformHost` | — |
| `people-contracts` | What People publishes: `MonthQuote`, `PeopleContract`, its events, and the wire schemas of `people-api` | `platform`, `shared-common` |
| `delivery-contracts` | What Delivery publishes: `MonthUtilisation`, `DeliveryContract`, its events, and the wire schemas of `delivery-api` | `platform`, `shared-common` |
| `people-domain` | R1: the rate timeline, month quoting, `personMonthHours`, register search | `people-contracts`, `shared-common` |
| `delivery-domain` | R2–R5: unit conversion, the breakdown tree, the allocation index, the grid model, cross-project utilisation | `delivery-contracts`, `people-contracts`, `shared-common` |
| `tsconfig`, `eslint-config`, `vitest-config`, `rspack-config` | Shared tooling. Not application coupling — none of them knows what People or Delivery do. | — |

## Why `platform` has no `@repo` dependencies

It would need both contract packages to type its registry, and both contract packages need it to
define their keys — a cycle. `ContractKey<TContract>` carries the contract type as a phantom
property instead, so `registry.get(PEOPLE_CONTRACT)` is fully typed while `platform` sits below both
of them in the graph and knows about neither.

## Why the domain lives in packages, not in the apps

The brief says it looks hardest at "calculation logic that runs without mounting React". Keeping the
rules in libraries makes that literally true: `pnpm test` runs 205 tests in Node, and the apps are
thin enough that there is nothing in them worth a snapshot test.
