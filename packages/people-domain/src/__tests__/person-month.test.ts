import { toMonthKey, type Employee, type EmployeeId } from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import { hoursPerWorkingDay, personMonthHours, searchEmployees, sortEmployeesByName } from '../index';

describe('personMonthHours (R2)', () => {
  it('is 176.00 h for 40 h/week in March 2026 — the reference figure', () => {
    expect(personMonthHours(40, toMonthKey('2026-03'))).toBe(176);
  });

  it('is not a constant: the same person differs month to month', () => {
    expect(personMonthHours(40, toMonthKey('2026-04'))).toBe(176); // 22 working days
    expect(personMonthHours(40, toMonthKey('2026-05'))).toBe(168); // 21 working days
    expect(personMonthHours(40, toMonthKey('2026-02'))).toBe(160); // 20 working days
  });

  it('scales with contracted hours', () => {
    const march = toMonthKey('2026-03');

    expect(personMonthHours(32, march)).toBeCloseTo(140.8, 10);
    expect(personMonthHours(20, march)).toBe(88);
  });
});

describe('hoursPerWorkingDay (R1)', () => {
  it('spreads 88 hours evenly across 22 working days as 4.00 h/day', () => {
    expect(hoursPerWorkingDay(88, toMonthKey('2026-03'))).toBe(4);
  });

  it('is zero for zero hours', () => {
    expect(hoursPerWorkingDay(0, toMonthKey('2026-03'))).toBe(0);
  });
});

const EMPLOYEES: Employee[] = [
  { id: 'emp-001' as EmployeeId, name: 'Adaeze Okafor', role: 'Tech Lead', weeklyHours: 40 },
  { id: 'emp-002' as EmployeeId, name: 'Bo Andersen', role: 'QA Engineer', weeklyHours: 32 },
  { id: 'emp-003' as EmployeeId, name: 'Émile Rousseau', role: 'Tech Lead', weeklyHours: 20 },
];

describe('searchEmployees (F3)', () => {
  it('returns everyone for an empty query', () => {
    expect(searchEmployees(EMPLOYEES, '   ')).toHaveLength(3);
  });

  it('matches on name, case-insensitively', () => {
    expect(searchEmployees(EMPLOYEES, 'okafor').map((e) => e.id)).toEqual(['emp-001']);
  });

  it('matches on role', () => {
    expect(searchEmployees(EMPLOYEES, 'tech lead')).toHaveLength(2);
  });

  it('ignores accents so "emile" finds "Émile"', () => {
    expect(searchEmployees(EMPLOYEES, 'emile').map((e) => e.id)).toEqual(['emp-003']);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchEmployees(EMPLOYEES, 'zzz')).toEqual([]);
  });

  it('sorts by name without mutating the input', () => {
    const sorted = sortEmployeesByName([...EMPLOYEES].reverse());

    expect(sorted.map((e) => e.id)).toEqual(['emp-001', 'emp-002', 'emp-003']);
  });
});
