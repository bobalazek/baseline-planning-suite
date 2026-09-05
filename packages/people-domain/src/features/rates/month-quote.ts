import type { MonthQuote, QuoteSegment } from '@repo/people-contracts';
import {
  splitMonthAt,
  workingDaysInMonth,
  type EmployeeId,
  type MonthKey,
} from '@repo/shared-common';

import { type RateTimeline } from './rate-timeline';

/**
 * Price one month for one person (R1).
 *
 * The month is cut at every rate change inside it. Effort spreads evenly over working days, so the
 * hours in a segment are `segmentDays × (hours ÷ monthDays)` and the month collapses to one
 * working-day-weighted rate: `cost = hours × blendedRate`. That identity is why the published
 * contract is a quote rather than a per-cell call (see decisions/0002-rate-cost-boundary.md).
 *
 * Days before the first rate record become an unpriced segment: they cost zero and mark the cell,
 * rather than quietly pricing at whatever came next.
 */
export function quoteMonth(
  employeeId: EmployeeId,
  month: MonthKey,
  timeline: RateTimeline
): MonthQuote {
  const workingDays = workingDaysInMonth(month);

  if (workingDays === 0) {
    return {
      employeeId,
      month,
      workingDays: 0,
      segments: [],
      blendedRate: 0,
      unpricedWorkingDays: 0,
    };
  }

  // For each record, how many of the month's working days fall strictly before it starts. Records
  // that began before this month all collapse to 0, which is exactly right: only the last of them
  // is in force on the 1st, and the earlier ones produce zero-length segments that get dropped.
  const cuts = timeline.records.map((record) => splitMonthAt(month, record.validFrom).before);

  const unpricedWorkingDays = cuts[0] ?? workingDays;
  const segments: QuoteSegment[] = [];
  let weightedRate = 0;

  if (unpricedWorkingDays > 0) {
    segments.push({ workingDays: unpricedWorkingDays, priced: false });
  }

  for (let index = 0; index < timeline.records.length; index += 1) {
    const start = cuts[index] as number;
    const end = cuts[index + 1] ?? workingDays;
    const segmentDays = end - start;

    if (segmentDays <= 0) {
      continue;
    }

    const record = timeline.records[index];

    if (!record) {
      continue;
    }

    segments.push({ workingDays: segmentDays, priced: true });
    weightedRate += segmentDays * record.hourlyCost;
  }

  return {
    employeeId,
    month,
    workingDays,
    segments,
    blendedRate: weightedRate / workingDays,
    unpricedWorkingDays,
  };
}
