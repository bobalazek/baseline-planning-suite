# @repo/acceptance

The only place in the repo allowed to see both domains at once.

`@repo/people-domain` and `@repo/delivery-domain` never import each other — that separation is the
point of the exercise, and `boundaries.test.ts` here enforces it. But the brief's reference
calculation spans both: People prices a month, Delivery spends it. So the end-to-end assertions live
in a test-only workspace app that depends on both, composes them exactly as the running suite does,
and runs against the shipped fixture with no mocks and no React.

Nothing here is built or shipped. `pnpm --filter @repo/acceptance test`.

| File                            | Proves                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| `reference-calculation.test.ts` | Figure 4, all nine numbers, from `fixtures/baseline-seed.json` |
| `fixture-integrity.test.ts`     | The fixture is the one the brief describes                     |
| `totals-reconcile.test.ts`      | R3 over every project, every unit, every row                   |
| `capacity.test.ts`              | R5 over the whole fixture                                      |
| `boundaries.test.ts`            | The architecture claims in the ADRs are true of the source     |
