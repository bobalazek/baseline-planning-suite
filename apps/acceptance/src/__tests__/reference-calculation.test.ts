import { fromDisplayValue, toDisplayValue } from '@repo/delivery-domain';
import { hoursPerWorkingDay } from '@repo/people-domain';
import {
  roundTo,
  splitMonthAt,
  toIsoDate,
  toMonthKey,
  workingDaysInMonth,
  type AllocationId,
  type EmployeeId,
} from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import { composeSuite } from '../fixtures/compose-suite';

/**
 * §3.3 Figure 4 of the brief — the reference calculation.
 *
 *   "If your build does not produce these five numbers, stop and fix that before anything else."
 *
 * Nothing here is hand-fed. The employee, the two rate records and the 0.50 person-month cell are
 * all read out of the shipped fixture, and the numbers come from the same code path the running
 * grid uses.
 */
describe('Reference calculation — A. Okafor, March 2026 (Figure 4)', () => {
  const suite = composeSuite();

  const OKAFOR = 'emp-001' as EmployeeId;
  const MARCH_2026 = toMonthKey('2026-03');
  const RATE_CHANGE = toIsoDate('2026-03-12');

  const employee = suite.employeeById.get(OKAFOR);
  const cell = suite.seed.allocations.find(
    (allocation) => allocation.id === ('alloc-001' as AllocationId)
  );

  it('reads its inputs from the shipped fixture, not from the test', () => {
    expect(employee?.name).toBe('Adaeze Okafor');
    expect(employee?.weeklyHours).toBe(40);

    const rates = suite.seed.rateRecords
      .filter((record) => record.employeeId === OKAFOR)
      .map((record) => [record.validFrom, record.hourlyCost]);

    expect(rates).toEqual([
      ['2025-01-01', 80],
      ['2026-03-12', 95],
    ]);

    expect(cell?.employeeId).toBe(OKAFOR);
    expect(cell?.month).toBe('2026-03');
    expect(cell?.amount).toBe(0.5);
  });

  it('March 2026 working days = 22', () => {
    expect(workingDaysInMonth(MARCH_2026)).toBe(22);
  });

  it('working days before 12 Mar = 8, and validFrom is inclusive', () => {
    expect(splitMonthAt(MARCH_2026, RATE_CHANGE).before).toBe(8);
  });

  it('working days from 12 Mar on = 14', () => {
    expect(splitMonthAt(MARCH_2026, RATE_CHANGE).from).toBe(14);
  });

  it('one person-month = 40 × 22 ÷ 5 = 176.00 h', () => {
    expect(roundTo(suite.personMonthHours(OKAFOR, MARCH_2026), 2)).toBe(176.0);
  });

  it('this allocation in hours = 0.50 × 176 = 88.00 h', () => {
    const hours = toDisplayValue(cell?.amount ?? 0, 'hours', suite.pricing(OKAFOR, MARCH_2026));

    expect(roundTo(hours as number, 2)).toBe(88.0);
  });

  it('hours per working day = 88 ÷ 22 = 4.00 h', () => {
    expect(roundTo(hoursPerWorkingDay(88, MARCH_2026), 2)).toBe(4.0);
  });

  it('cost = 8 × 4 × 80 + 14 × 4 × 95 = 2,560 + 5,320 = €7,880.00', () => {
    const cost = toDisplayValue(cell?.amount ?? 0, 'cost', suite.pricing(OKAFOR, MARCH_2026));

    expect(roundTo(cost as number, 2)).toBe(7880.0);
    expect(8 * 4 * 80 + 14 * 4 * 95).toBe(7880);
  });

  it('the same cell in % of capacity = 50.0%', () => {
    const percent = toDisplayValue(cell?.amount ?? 0, 'percent', suite.pricing(OKAFOR, MARCH_2026));

    expect(roundTo(percent as number, 1)).toBe(50.0);
  });

  it('implied blended rate = €89.5455/h', () => {
    expect(roundTo(suite.quoteMonth(OKAFOR, MARCH_2026).blendedRate, 4)).toBe(89.5455);
  });

  it('splits the month into exactly two priced segments of 8 and 14 working days', () => {
    expect(suite.quoteMonth(OKAFOR, MARCH_2026).segments).toEqual([
      { workingDays: 8, priced: true },
      { workingDays: 14, priced: true },
    ]);
  });

  it('inverts: typing €7,880.00 into that cell stores 0.50 person-months (R2)', () => {
    const stored = fromDisplayValue(7880, 'cost', suite.pricing(OKAFOR, MARCH_2026));

    expect(roundTo(stored as number, 2)).toBe(0.5);
  });
});
