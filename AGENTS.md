# AGENTS.md

Entry point for anyone — human or agent — changing this repository.

## Read first

1. [README.md](./README.md) — how to run it and what it does
2. [docs/overview.md](./docs/overview.md) — the shape of the system and the one idea behind it
3. [docs/project/prd.md](./docs/project/prd.md) — every requirement, restated as a testable item
4. [docs/conventions/README.md](./docs/conventions/README.md) — the coding rules
5. [docs/reference/folder-structure.md](./docs/reference/folder-structure.md) — where code belongs

## Absolute rules

1. **No `any`.** It is a hard constraint of the brief, an ESLint error, and a static test. There is
   no `eslint-disable` for it.
2. **The two teams never import each other.** `apps/delivery` and `packages/delivery-*` may use
   `@repo/people-contracts` and nothing else of People's; the reverse holds for People.
   `apps/acceptance` is the only exception and ships nothing.
3. **Rate records stay inside People.** No `hourlyCost`, `RateRecord` or `validFrom` in Delivery.
4. **Domain rules live in `packages/*-domain`,** as pure functions with no React, no DOM and no I/O.
   If a rule needs a browser to test, it is in the wrong place.
5. **Import from package roots, statically, at the top of the file.** The single exception is each
   frontend's `src/index.ts` async boundary, which is commented.
6. One `src/index.ts` per package; one exported React component per file.
7. **Never re-export another package's types or values.**
8. Remote URLs are never written into a bundle. They arrive from `/config.json` at runtime.
9. `process.env` is read only in `packages/shared-backend/src/env.ts` and each service's `src/env.ts`.

## Before finishing a change

```bash
pnpm verify
```

`format:check`, `lint`, `typecheck` and all 205 tests. `apps/acceptance` additionally checks rules
1–3 and 5 against the source, so breaking a boundary fails the build rather than review.

If a change touches a rule from §3.3 of the brief, the test for it is named after the rule — update
that, not around it.
