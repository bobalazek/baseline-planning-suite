# ADR-0006, Leaf cells are the only rounded values; every aggregate is derived

**Status:** accepted · **Relates to:** R3, R4

## Context

R3 asks for two things at once:

> Totals are computed from exact values and rounded only for display. The displayed total must
> equal the sum of the displayed cells: use largest-remainder distribution so the rounded cells add
> to the rounded total exactly.

The staffing grid aggregates in **two** directions. A leaf cell is summed rightwards into its row's
TOTAL column, and downwards into the derived work-package row above it (R4). Largest-remainder
apportionment adjusts _cells_ to match a _total_, but each leaf cell belongs to one row group and
one column group, and in general no single rounding of the cells satisfies both. This is the
controlled-rounding (matrix apportionment) problem; it has no exact solution for arbitrary inputs.

A worked example from the tests. Two people on one work package in April carry 0.805 and 0.705
person-months:

|                  | Exact    | Rounded independently  |
| ---------------- | -------- | ---------------------- |
| Person A         | 0.805    | 0.81                   |
| Person B         | 0.705    | 0.71                   |
| **Work package** | **1.51** | 0.81 + 0.71 = **1.52** |

Something has to give: either the parent prints 1.51 and the column visibly fails to add up, or it
prints 1.52 and differs from its own rounded exact value by a cent.

## Decision

**Leaf (per-person) cells are the only values rounded from exact numbers. Every aggregate, derived
work-package rows, row totals, column totals, the grand total, is the sum of values already on
screen.**

Concretely:

1. For each assignment row, `distributeRounded` adjusts the twelve month cells so they sum exactly
   to `roundTo(exact row total)`. A leaf row's TOTAL is therefore computed from exact values, as R3
   requires.
2. Every work-package row is built by summing the displayed cells of its children, deepest first.
3. Column totals and the grand total sum the displayed root rows.

## Consequences

**What holds exactly, everywhere, in every unit:**

- a row's TOTAL equals the sum of the cells printed beside it;
- a derived cell equals the sum of the cells printed beneath it;
- a derived row's TOTAL equals the sum of its children's TOTALs;
- the grand total equals both the sum of the column totals and the sum of the root rows.

Every relationship a reader can check with their eyes is exact. This is the reading of R3 the
product is judged on, and it is also the literal reading of R4, "effort and cost on a parent come
from its children".

**What is given up:** a derived value can differ from `roundTo(exact)` by up to one unit in the last
place per contributing child. In the example above the work-package row prints 1.52 where its own
exact value rounds to 1.51.

**Why this axis and not the other.** Apportioning down the tree instead, parent from exact,
children adjusted to match, would make derived cells exact and let the TOTAL column drift instead.
That is the worse trade: a row total accumulates across twelve months rather than across two or
three children, so its worst-case drift is several times larger, and the TOTAL column is the number
a planner reads most often.

**On the tolerance.** The brief notes that the 0.01 tolerance is "a floating-point allowance, not a
rounding budget", and this decision does not spend it as one: the invariants above hold to within
floating-point error, not to within a cent. The drift described here is between a _derived_ value
and a value nobody displays. `apps/acceptance` measures the largest such drift over the whole
shipped fixture in every unit and asserts it stays within one unit in the last place.
