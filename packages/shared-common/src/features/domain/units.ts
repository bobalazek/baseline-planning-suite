/**
 * The four units the staffing grid reads and edits in (R2), and the fixed display precision of
 * each. One of them — `personMonths` — is what gets stored; the other three are conversions
 * applied at the edge of the grid and never persisted.
 */
export const DISPLAY_UNITS = ['personMonths', 'hours', 'percent', 'cost'] as const;

export type DisplayUnit = (typeof DISPLAY_UNITS)[number];

/** The unit `Allocation.amount` is stored in. Everything else is derived. */
export const CANONICAL_UNIT = 'personMonths' satisfies DisplayUnit;

/** "Display precision is fixed: hours 2dp, person-months 2dp, % 1dp, cost 2dp." */
export const UNIT_DECIMALS: Readonly<Record<DisplayUnit, number>> = {
  personMonths: 2,
  hours: 2,
  percent: 1,
  cost: 2,
};

export const UNIT_LABELS: Readonly<Record<DisplayUnit, string>> = {
  personMonths: 'PM',
  hours: 'Hours',
  percent: '%',
  cost: '€',
};

/** A person-month is 100% of capacity, by definition (R2/R5). */
export const CAPACITY_PERSON_MONTHS = 1;

/**
 * Floating-point allowance when comparing a rolled-up total against its parts. The brief is
 * explicit that this is "a floating-point allowance, not a rounding budget" — it exists so that
 * summing 720 doubles in a different order does not fail an equality check, and it is never used
 * to excuse a value that is actually wrong.
 */
export const RECONCILIATION_TOLERANCE = 0.01;
