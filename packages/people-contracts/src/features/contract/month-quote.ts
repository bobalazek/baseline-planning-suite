import type { EmployeeId, MonthKey } from '@repo/shared-common';

/**
 * One stretch of a month priced at a single rate. Deliberately **prices nothing**: it carries how
 * many working days the stretch is and whether those days had a rate at all, so Delivery can say
 * "this month is split across two rate periods" and mark unpriced cells, without ever learning
 * what anybody earns.
 *
 * See docs/project/decisions/0002-rate-cost-boundary.md — this is where the boundary actually is.
 */
export interface QuoteSegment {
  readonly workingDays: number;
  /** `false` for days before the employee's first rate record. Those days cost zero (R1). */
  readonly priced: boolean;
}

/**
 * Everything Delivery needs in order to put a number in a cost cell, and nothing more.
 *
 * The key fact that makes this shape sufficient: an allocation is spread evenly over the month's
 * working days, so a month's cost is exactly `hours × blendedRate` no matter how many rate changes
 * fall inside it. The month has one price, and this is it.
 */
export interface MonthQuote {
  readonly employeeId: EmployeeId;
  readonly month: MonthKey;
  readonly workingDays: number;
  /** At least one. More than one means a rate changed mid-month. */
  readonly segments: readonly QuoteSegment[];
  /** Euro per hour, weighted by working days. Zero when the whole month is unpriced. */
  readonly blendedRate: number;
  /** Greater than zero means the cell is marked: some of this month had no rate (R1). */
  readonly unpricedWorkingDays: number;
}

export function isSplitAcrossRates(quote: MonthQuote): boolean {
  return quote.segments.length > 1;
}
