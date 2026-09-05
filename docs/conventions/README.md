# Conventions

## Package boundaries

```text
@repo/shared-common     no @repo/* dependencies; browser-safe
        ↑
@repo/platform          no @repo/* dependencies either — see architecture/packages.md
        ↑
@repo/{people,delivery}-contracts
        ↑
@repo/{people,delivery}-domain
        ↑
apps/*
```

The two teams never meet except at a contract package. Enforced by
`apps/acceptance/src/__tests__/boundaries.test.ts`.

## Imports

- Import from package roots. Never `@repo/*/src/*`.
- Never re-export another package's types or values. Import from the source package.
- All first-party imports are static and at the top of the file. If that produces a cycle, change
  the shape — extract the shared piece, or invert the direction. Do not hide it behind
  `await import()`.
- The one exception is each frontend's `src/index.ts`, where Module Federation requires an async
  boundary before shared modules are touched. It is one line, and it carries a comment saying so.

## Types

- `strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **No `any`.** `@typescript-eslint/no-explicit-any` is an error, there is no `eslint-disable` for
  it anywhere, and a static test sweeps the tree for both.
- Ids are branded (`EmployeeId`, `BreakdownItemId`, …). The wire schemas produce the branded types,
  so parsing is the only place a `string` becomes an id.
- Prefer making a wrong state unrepresentable over validating against it. `MonthQuote` has no
  `hourlyCost` field, so Delivery cannot read one.

## Files

- One `src/index.ts` per package; no nested barrels.
- One exported React component per file. Helper subcomponents stay local and unexported.
- Pure non-React helpers live in `utils/` as `*.utils.ts`.
- API handlers are `*.handler.ts` with exactly one exported `handle*`; anything beyond transport
  orchestration belongs in a manager or a domain package.

## Where logic goes

Domain rules live in `packages/*-domain` as pure functions — no React, no DOM, no I/O. Services own
transactions, not rules; where an operation must be atomic (R4's reparenting), the service calls the
same domain function the frontend would. Apps choose, wire and paint.

## Comments

Explain the decision, not the mechanics. A comment earns its place by saying why a piece of code is
shaped the way it is — which alternative was rejected, which failure it prevents — not by restating
what the line does.

## Tests

Heaviest where the brief says it looks hardest: pure calculation. No snapshot tests of markup, no
browser-driver suite. Every rule of §3.3 has a test named after it.
