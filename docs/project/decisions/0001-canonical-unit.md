# ADR-0001, The canonical unit is the person-month

**Status:** accepted · **Relates to:** R2, R5

## Context

The grid reads and edits in four units, hours, person-months, % of capacity, cost. The brief
requires exactly one to be stored and the other three to be conversions "at the edges". The
conversions are not constants:

```
personMonthHours(e, m) = e.weeklyHours × workingDays(m) ÷ 5     // varies by person and month
hours   = personMonths × personMonthHours(e, m)
percent = personMonths × 100
cost    = hours × blendedRate(e, m)
```

## Decision

Store `Allocation.amount` in **person-months**.

## Why

1. **It is the unit the plan is written in.** The fixtures ship person-months, and the review grid
   in the brief (Figure 5) is denominated in them. Importing the seed is lossless, no conversion
   is applied to data we were given.
2. **Capacity is defined in it.** R5 says capacity for a month is _100 % of that person's
   person-month_. With person-months stored, the cross-project capacity check is
   `Σ amount > 1.0`, an exact comparison over Delivery's own data, needing nothing from People.
   Stored in hours, every capacity check would first have to ask People for `personMonthHours`,
   putting a cross-remote call on the hottest path in the product.
3. **It is the stable expression of a staffing commitment.** "Half of this person's month" survives
   a change in month length or in the person's contracted hours; "88 hours" silently becomes 62.5 %
   of a month if the person drops to 32 h/week. The first is what a planner meant.
4. **It keeps Delivery's store free of People's data.** Hours and cost both require `weeklyHours`,
   which People owns. Storing person-months means Delivery persists only what Delivery owns.

## Consequences

- Hours and cost are derived and therefore require People to be reachable. When it is not, the grid
  degrades to person-months and %; both computable from Delivery's own state, rather than going
  blank. This is a feature of the boundary, not a workaround.
- Round-tripping is safe: switching display units performs no write. Only a committed edit converts
  back to person-months, and conversion is exact double arithmetic in both directions.
- Floating-point drift is confined to display, where R3's largest-remainder distribution guarantees
  cells add to their total.

## Alternatives rejected

- **Hours.** Attractive because cost is `hours × rate` with no intermediate. Rejected on (2) and
  (4): it drags `weeklyHours`; People's field, into every capacity comparison and into the store.
- **Cost.** Rejected outright: it would bake a rate into the plan, so a retroactive rate correction
  in People would silently change how much work was planned.
