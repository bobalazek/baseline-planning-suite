import {
  toIsoDate,
  type EmployeeId,
  type IsoDate,
  type RateRecord,
  type RateRecordId,
} from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import { buildRateTimeline, describeRateProblem, firstRateDate, rateOn, validateRateRecords } from '../index';

const OKAFOR = 'emp-001' as EmployeeId;

function rate(id: string, validFrom: string, hourlyCost: number): RateRecord {
  return {
    id: id as RateRecordId,
    employeeId: OKAFOR,
    validFrom: toIsoDate(validFrom) as IsoDate,
    hourlyCost,
  };
}

describe('buildRateTimeline', () => {
  it('orders records by effective date regardless of input order', () => {
    const timeline = buildRateTimeline([
      rate('rate-002', '2026-03-12', 95),
      rate('rate-001', '2025-01-01', 80),
    ]);

    expect(timeline.records.map((record) => record.id)).toEqual(['rate-001', 'rate-002']);
  });

  it('does not mutate the caller"s array', () => {
    const records = [rate('rate-002', '2026-03-12', 95), rate('rate-001', '2025-01-01', 80)];

    buildRateTimeline(records);

    expect(records[0]?.id).toBe('rate-002');
  });
});

describe('rateOn', () => {
  const timeline = buildRateTimeline([
    rate('rate-001', '2025-01-01', 80),
    rate('rate-002', '2026-03-12', 95),
  ]);

  it('returns null before the first record — those days cost zero', () => {
    expect(rateOn(timeline, toIsoDate('2024-12-31'))).toBeNull();
  });

  it('includes the validFrom day itself', () => {
    expect(rateOn(timeline, toIsoDate('2025-01-01'))).toBe(80);
    expect(rateOn(timeline, toIsoDate('2026-03-12'))).toBe(95);
  });

  it('holds the previous rate right up to the day before a change', () => {
    expect(rateOn(timeline, toIsoDate('2026-03-11'))).toBe(80);
  });

  it('runs the last record forward with no end date', () => {
    expect(rateOn(timeline, toIsoDate('2099-01-01'))).toBe(95);
  });

  it('reports the first effective date, or null when there are no rates', () => {
    expect(firstRateDate(timeline)).toBe('2025-01-01');
    expect(firstRateDate(buildRateTimeline([]))).toBeNull();
  });
});

describe('validateRateRecords', () => {
  it('accepts a retroactive correction — R1 allows editing the past', () => {
    const records = [rate('rate-001', '2025-01-01', 82), rate('rate-002', '2026-03-12', 95)];

    expect(validateRateRecords(records)).toEqual([]);
  });

  it('rejects two records claiming the same day', () => {
    const problems = validateRateRecords([
      rate('rate-001', '2026-03-12', 80),
      rate('rate-002', '2026-03-12', 95),
    ]);

    expect(problems).toEqual([{ kind: 'duplicate-valid-from', validFrom: '2026-03-12' }]);
    expect(describeRateProblem(problems[0]!)).toContain('2026-03-12');
  });

  it('rejects a negative hourly cost', () => {
    expect(validateRateRecords([rate('rate-001', '2025-01-01', -1)])).toEqual([
      { kind: 'negative-cost', hourlyCost: -1 },
    ]);
  });

  it('accepts an empty timeline — an employee may have no rate yet', () => {
    expect(validateRateRecords([])).toEqual([]);
  });
});
