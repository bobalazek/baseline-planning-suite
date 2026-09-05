import { isSplitAcrossRates } from '@repo/people-contracts';
import {
  toIsoDate,
  toMonthKey,
  type EmployeeId,
  type IsoDate,
  type RateRecord,
  type RateRecordId,
} from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import { buildRateTimeline, quoteMonth } from '../index';

const OKAFOR = 'emp-001' as EmployeeId;
const MARCH_2026 = toMonthKey('2026-03');

function rate(id: string, validFrom: string, hourlyCost: number): RateRecord {
  return {
    id: id as RateRecordId,
    employeeId: OKAFOR,
    validFrom: toIsoDate(validFrom) as IsoDate,
    hourlyCost,
  };
}

describe('quoteMonth', () => {
  it('blends a mid-month rate change by working days — the Figure 4 month', () => {
    const timeline = buildRateTimeline([
      rate('rate-001', '2025-01-01', 80),
      rate('rate-002', '2026-03-12', 95),
    ]);

    const quote = quoteMonth(OKAFOR, MARCH_2026, timeline);

    expect(quote.workingDays).toBe(22);
    expect(quote.segments).toEqual([
      { workingDays: 8, priced: true },
      { workingDays: 14, priced: true },
    ]);
    expect(quote.blendedRate).toBeCloseTo((8 * 80 + 14 * 95) / 22, 10);
    expect(quote.unpricedWorkingDays).toBe(0);
    expect(isSplitAcrossRates(quote)).toBe(true);
  });

  it('returns the flat rate when nothing changes inside the month', () => {
    const timeline = buildRateTimeline([rate('rate-001', '2025-01-01', 80)]);
    const quote = quoteMonth(OKAFOR, MARCH_2026, timeline);

    expect(quote.blendedRate).toBe(80);
    expect(quote.segments).toEqual([{ workingDays: 22, priced: true }]);
    expect(isSplitAcrossRates(quote)).toBe(false);
  });

  it('ignores every rate superseded before the month starts', () => {
    const timeline = buildRateTimeline([
      rate('rate-001', '2020-01-01', 10),
      rate('rate-002', '2021-01-01', 20),
      rate('rate-003', '2022-01-01', 30),
    ]);

    const quote = quoteMonth(OKAFOR, MARCH_2026, timeline);

    expect(quote.blendedRate).toBe(30);
    expect(quote.segments).toEqual([{ workingDays: 22, priced: true }]);
  });

  it('handles more than one change in a month — "more than two slices"', () => {
    const timeline = buildRateTimeline([
      rate('rate-001', '2025-01-01', 80),
      rate('rate-002', '2026-03-12', 95),
      rate('rate-003', '2026-03-24', 110),
    ]);

    const quote = quoteMonth(OKAFOR, MARCH_2026, timeline);

    // 8 days before the 12th, 8 more up to the 23rd, 6 from the 24th.
    expect(quote.segments).toEqual([
      { workingDays: 8, priced: true },
      { workingDays: 8, priced: true },
      { workingDays: 6, priced: true },
    ]);
    expect(quote.blendedRate).toBeCloseTo((8 * 80 + 8 * 95 + 6 * 110) / 22, 10);
  });

  it('prices a month entirely before the first rate at zero, and marks it (R1)', () => {
    const timeline = buildRateTimeline([rate('rate-002', '2026-03-12', 95)]);
    const quote = quoteMonth(OKAFOR, toMonthKey('2026-01'), timeline);

    expect(quote.blendedRate).toBe(0);
    expect(quote.unpricedWorkingDays).toBe(quote.workingDays);
    expect(quote.segments).toEqual([{ workingDays: 22, priced: false }]);
  });

  it('marks a month that only partly precedes the first rate', () => {
    const timeline = buildRateTimeline([rate('rate-002', '2026-03-12', 95)]);
    const quote = quoteMonth(OKAFOR, MARCH_2026, timeline);

    expect(quote.unpricedWorkingDays).toBe(8);
    expect(quote.segments).toEqual([
      { workingDays: 8, priced: false },
      { workingDays: 14, priced: true },
    ]);
    // The 8 unpriced days cost nothing, so the blend is diluted, not simply 95.
    expect(quote.blendedRate).toBeCloseTo((14 * 95) / 22, 10);
  });

  it('prices at zero when the employee has no rates at all', () => {
    const quote = quoteMonth(OKAFOR, MARCH_2026, buildRateTimeline([]));

    expect(quote.blendedRate).toBe(0);
    expect(quote.unpricedWorkingDays).toBe(22);
  });

  it('treats validFrom as inclusive — a rate starting on the 1st owns the whole month', () => {
    const timeline = buildRateTimeline([
      rate('rate-001', '2020-01-01', 80),
      rate('rate-002', '2026-03-01', 95),
    ]);

    expect(quoteMonth(OKAFOR, MARCH_2026, timeline).blendedRate).toBe(95);
  });

  it('keeps the segments adding up to the month, whatever the rate history', () => {
    const timeline = buildRateTimeline([
      rate('rate-001', '2026-03-02', 50),
      rate('rate-002', '2026-03-09', 60),
      rate('rate-003', '2026-03-17', 70),
      rate('rate-004', '2026-03-31', 80),
    ]);

    const quote = quoteMonth(OKAFOR, MARCH_2026, timeline);
    const totalDays = quote.segments.reduce((sum, segment) => sum + segment.workingDays, 0);

    expect(totalDays).toBe(quote.workingDays);
  });

  it('never lets the blended rate escape the range of the rates in force', () => {
    const timeline = buildRateTimeline([
      rate('rate-001', '2025-01-01', 80),
      rate('rate-002', '2026-03-12', 95),
    ]);

    const { blendedRate } = quoteMonth(OKAFOR, MARCH_2026, timeline);

    expect(blendedRate).toBeGreaterThan(80);
    expect(blendedRate).toBeLessThan(95);
  });
});
