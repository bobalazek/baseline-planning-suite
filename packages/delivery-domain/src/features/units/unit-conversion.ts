import type { MonthQuote } from '@repo/people-contracts';
import { CANONICAL_UNIT, type DisplayUnit } from '@repo/shared-common';

/**
 * Everything Delivery needs from People in order to show one cell in a unit other than the
 * canonical one. Assembled from the published contract; never from rate records.
 */
export interface CellPricing {
  /** `weeklyHours × workingDays ÷ 5` for this person in this month. */
  readonly personMonthHours: number;
  /** Working-day-weighted euro per hour for this person in this month. */
  readonly blendedRate: number;
  /** Some of the month had no rate: the cell costs less than the effort suggests, and is marked. */
  readonly unpriced: boolean;
  /** The month contains a rate change. */
  readonly splitAcrossRates: boolean;
}

export function toCellPricing(quote: MonthQuote, personMonthHours: number): CellPricing {
  return {
    personMonthHours,
    blendedRate: quote.blendedRate,
    unpriced: quote.unpricedWorkingDays > 0,
    splitAcrossRates: quote.segments.length > 1,
  };
}

/**
 * Convert the stored person-months into the unit the grid is currently showing (R2).
 *
 * Returns `null` when the conversion needs something Delivery does not have. Hours and cost both
 * need People; person-months and % of capacity never do — which is why the grid stays useful when
 * the People remote fails to load (F9), instead of going blank.
 */
export function toDisplayValue(
  personMonths: number,
  unit: DisplayUnit,
  pricing: CellPricing | null
): number | null {
  switch (unit) {
    // The stored unit. Naming it here rather than writing the string keeps the one decision of
    // ADR-0001 visible at the only place where a conversion is the identity.
    case CANONICAL_UNIT:
      return personMonths;
    case 'percent':
      return personMonths * 100;
    case 'hours':
      return pricing ? personMonths * pricing.personMonthHours : null;
    case 'cost':
      return pricing ? personMonths * pricing.personMonthHours * pricing.blendedRate : null;
  }
}

/**
 * Convert a value the planner typed back into the canonical person-months (R2).
 *
 * The euro case is the interesting one: "editing a cell in € in a month that contains a rate change
 * divides the amount entered by that cell's blended rate for the month — giving hours, which
 * convert to the canonical unit". A month with no rate at all has a blended rate of zero, so a euro
 * amount cannot be inverted; that returns `null` and the caller refuses the edit rather than
 * inventing effort.
 */
export function fromDisplayValue(
  entered: number,
  unit: DisplayUnit,
  pricing: CellPricing | null
): number | null {
  switch (unit) {
    case CANONICAL_UNIT:
      return entered;
    case 'percent':
      return entered / 100;
    case 'hours':
      return pricing && pricing.personMonthHours > 0 ? entered / pricing.personMonthHours : null;
    case 'cost': {
      if (!pricing || pricing.blendedRate <= 0 || pricing.personMonthHours <= 0) {
        return null;
      }

      const hours = entered / pricing.blendedRate;

      return hours / pricing.personMonthHours;
    }
  }
}

/** Whether a unit can be shown at all without People. Drives the degraded grid (F9). */
export function unitNeedsPricing(unit: DisplayUnit): boolean {
  return unit === 'hours' || unit === 'cost';
}
