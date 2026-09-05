import { describe, expect, it } from 'vitest';

import {
  addMonths,
  isWorkingDay,
  monthsBetween,
  splitMonthAt,
  toIsoDate,
  toMonthKey,
  workingDaysInMonth,
  workingDaysOf,
} from '../index';

const MARCH_2026 = toMonthKey('2026-03');

describe('working days', () => {
  it('counts Monday to Friday only, ignoring public holidays', () => {
    // 1 Jan 2026 is a Thursday and a public holiday nearly everywhere; R1 ignores holidays.
    expect(isWorkingDay(toIsoDate('2026-01-01'))).toBe(true);
    expect(isWorkingDay(toIsoDate('2026-03-14'))).toBe(false); // Saturday
    expect(isWorkingDay(toIsoDate('2026-03-15'))).toBe(false); // Sunday
    expect(isWorkingDay(toIsoDate('2026-03-16'))).toBe(true); // Monday
  });

  it('gives 22 working days for March 2026 — the reference month', () => {
    expect(workingDaysInMonth(MARCH_2026)).toBe(22);
  });

  it('agrees with an independent enumeration for every month around the grid horizon', () => {
    for (const month of monthsBetween(toMonthKey('2025-01'), toMonthKey('2027-12'))) {
      expect(workingDaysInMonth(month)).toBe(workingDaysOf(month).length);
    }
  });

  it('handles February in a leap year', () => {
    expect(workingDaysInMonth(toMonthKey('2024-02'))).toBe(21);
    expect(workingDaysInMonth(toMonthKey('2025-02'))).toBe(20);
  });
});

describe('splitMonthAt', () => {
  it('splits March 2026 at the 12th into 8 before and 14 from — validFrom is inclusive', () => {
    expect(splitMonthAt(MARCH_2026, toIsoDate('2026-03-12'))).toEqual({ before: 8, from: 14 });
  });

  it('puts the boundary day itself on the "from" side', () => {
    // 2 Mar 2026 is a Monday, so exactly one working day precedes the 3rd.
    expect(splitMonthAt(MARCH_2026, toIsoDate('2026-03-03'))).toEqual({ before: 1, from: 21 });
  });

  it('treats a weekend boundary as falling between the surrounding working days', () => {
    // Sat 14th: the 10 working days up to Fri 13th are before, the rest from.
    expect(splitMonthAt(MARCH_2026, toIsoDate('2026-03-14'))).toEqual({ before: 10, from: 12 });
  });

  it('puts everything on one side when the boundary is outside the month', () => {
    expect(splitMonthAt(MARCH_2026, toIsoDate('2020-01-01'))).toEqual({ before: 0, from: 22 });
    expect(splitMonthAt(MARCH_2026, toIsoDate('2030-01-01'))).toEqual({ before: 22, from: 0 });
  });

  it('keeps the two halves adding to the month for every day of every month', () => {
    for (const month of monthsBetween(toMonthKey('2026-01'), toMonthKey('2027-03'))) {
      for (let day = 1; day <= 28; day += 1) {
        const boundary = toIsoDate(`${month}-${String(day).padStart(2, '0')}`);
        const { before, from } = splitMonthAt(month, boundary);

        expect(before + from).toBe(workingDaysInMonth(month));
      }
    }
  });
});

describe('month arithmetic', () => {
  it('rolls over year boundaries in both directions', () => {
    expect(addMonths(toMonthKey('2026-12'), 1)).toBe('2027-01');
    expect(addMonths(toMonthKey('2026-01'), -1)).toBe('2025-12');
    expect(addMonths(toMonthKey('2026-01'), -13)).toBe('2024-12');
  });

  it('produces the twelve-month grid horizon inclusively', () => {
    const horizon = monthsBetween(toMonthKey('2026-04'), toMonthKey('2027-03'));

    expect(horizon).toHaveLength(12);
    expect(horizon[0]).toBe('2026-04');
    expect(horizon.at(-1)).toBe('2027-03');
  });

  it('rejects strings that are not real dates', () => {
    expect(() => toIsoDate('2026-02-30')).toThrow();
    expect(() => toMonthKey('2026-13')).toThrow();
  });
});
