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
 * The month is cut into segments at every rate change that lands inside it. Because effort is
 * spread evenly over working days, the hours in a segment are `segmentDays × (hours ÷ monthDays)`,
 * so the whole month collapses to a single working-day-weighted rate:
 *
 *     cost = hours × Σ(segmentDays × segmentRate) ÷ monthDays
 *          = hours × blendedRate
 *
 * That identity is what makes the published contract a quote rather than a per-cell RPC — see
 * docs/project/decisions/0002-rate-cost-boundary.md.
 *
 * Days before the employee's first rate record are carried as an unpriced segment: they cost zero
 * and they make the cell show a marker, rather than quietly pricing at whatever came next.
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
