# ADR-0002; People publishes a pricing quote; Delivery multiplies effort by it

**Status:** accepted · **Relates to:** R1, R2, F7 · _This is the decision §4 of the brief says is
being assessed._

## Context

> "Delivery prices its grid using rates that People owns. Whether Delivery reads rate records and
> computes cost itself, or asks People for a computed cost, is the decision we are assessing.
> Either can be right, make the choice deliberately and defend it."

Three shapes were considered:

- **A.** People publishes raw `RateRecord[]`; Delivery implements effective-dating, month splitting
  and blending.
- **B.** People publishes `costOf(employeeId, month, hours) → €`; Delivery never sees a rate.
- **C.** People publishes a _month quote_, the priced structure of the month, and Delivery
  applies it to its own effort.

## Decision

**C.** People exposes:

```ts
interface PricingContract {
  quoteMonth(employeeId: EmployeeId, month: MonthKey): MonthQuote;
  personMonthHours(employeeId: EmployeeId, month: MonthKey): number;
}

interface MonthQuote {
  workingDays: number;
  slices: readonly RateSlice[]; // { workingDays, hourlyCost | null }
  blendedRate: number; // € per hour, working-day weighted
  unpricedWorkingDays: number; // > 0 ⇒ the cell is marked (R1)
}
```

Delivery computes `hours = personMonths × personMonthHours` and `cost = hours × blendedRate`.
Rate records never cross the boundary.

## Why

**The even-spread rule makes the month linear in hours.** Effort per working day is
`hours ÷ workingDays`, identical on every working day, so

```
cost = Σ sliceDays × (hours ÷ workingDays) × sliceRate
     = hours × (Σ sliceDays × sliceRate ÷ workingDays)
     = hours × blendedRate
```

A month therefore has a _single_ number that fully describes its price, independent of how much
effort is in it. That number is a pure function of the rate timeline and the calendar; both of
which are People's, and of nothing Delivery owns. This is the natural seam, and it decides between
the three options:

- Against **A**: effective-dating, `validFrom` inclusivity and mid-month splitting are rate
  semantics. A team that does not own rate records should not be the second implementation of them
  , and it would be a second implementation, because People needs the same logic for its own
  register views. One rule, one owner.
- Against **B**: a per-cell RPC is the wrong granularity. Pricing the visible grid means one call
  per cell (~720) plus one per roll-up node, all recomputed on every rate edit, and People would
  still have to expose `blendedRate` separately, because R2 requires it to convert a **€** edit back
  into hours. B is chattier _and_ leaks the same number anyway.
- For **C**: the quote is cached per `(employee, month)` and invalidated by a `rates-changed` event
  (F7), so a rate edit recosts an open grid in one pass over the affected person's cells. The
  contract carries `slices` and `unpricedWorkingDays` as well as the scalar, so Delivery can render
  "priced at two rates" and the zero-rate marking without inferring anything.

**What each side ends up owning.** People owns _what an hour of this person costs in this month_.
Delivery owns _how many hours are in this cell and how they roll up_. Neither can state the other's
half, and cost is the product, computed where the effort lives.

## Consequences

- Delivery has no `hourlyCost` in its model and no rate arithmetic in its domain layer. `grep -r
hourlyCost apps/delivery/src` returns nothing; a test asserts this.
- People carries the full pricing implementation (`rate-timeline.ts`, `month-quote.ts`) and tests it
  as pure functions with no React mounted.
- If People fails to load, Delivery still renders person-months and % of capacity and shows
  "pricing unavailable" where money would be (F9). Cost is the only thing lost.
- The quote is a value object, so it is trivially memoisable and trivially testable.
