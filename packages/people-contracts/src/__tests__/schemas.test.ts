import { describe, expect, it } from 'vitest';

import {
  createRateRecordSchema,
  employeeSchema,
  peopleSnapshotSchema,
  rateRecordSchema,
  updateRateRecordSchema,
} from '../index';

describe('employeeSchema', () => {
  it('accepts a row exactly as the fixture ships it', () => {
    expect(
      employeeSchema.parse({
        id: 'emp-001',
        name: 'Adaeze Okafor',
        role: 'Tech Lead',
        weeklyHours: 40,
      }).weeklyHours
    ).toBe(40);
  });

  it('accepts every contracted week the domain allows, and nothing else', () => {
    for (const weeklyHours of [40, 32, 20]) {
      expect(
        employeeSchema.safeParse({ id: 'e', name: 'n', role: 'r', weeklyHours }).success
      ).toBe(true);
    }

    expect(
      employeeSchema.safeParse({ id: 'e', name: 'n', role: 'r', weeklyHours: 37.5 }).success
    ).toBe(false);
  });

  it('rejects an empty id or name', () => {
    expect(employeeSchema.safeParse({ id: '', name: 'n', role: 'r', weeklyHours: 40 }).success).toBe(
      false
    );
  });
});

describe('rateRecordSchema', () => {
  it('accepts the reference rate records', () => {
    expect(
      rateRecordSchema.parse({
        id: 'rate-002',
        employeeId: 'emp-001',
        validFrom: '2026-03-12',
        hourlyCost: 95,
      }).hourlyCost
    ).toBe(95);
  });

  it('rejects a date that is not YYYY-MM-DD', () => {
    for (const validFrom of ['2026-3-12', '12/03/2026', '2026-03-12T00:00:00Z', '2026-13-01']) {
      expect(
        rateRecordSchema.safeParse({ id: 'r', employeeId: 'e', validFrom, hourlyCost: 95 }).success
      ).toBe(false);
    }
  });

  it('rejects a negative hourly cost but allows zero', () => {
    const base = { id: 'r', employeeId: 'e', validFrom: '2026-03-12' };

    expect(rateRecordSchema.safeParse({ ...base, hourlyCost: 0 }).success).toBe(true);
    expect(rateRecordSchema.safeParse({ ...base, hourlyCost: -1 }).success).toBe(false);
  });
});

describe('peopleSnapshotSchema', () => {
  it('accepts an empty register', () => {
    expect(peopleSnapshotSchema.parse({ employees: [], rateRecords: [] }).employees).toEqual([]);
  });

  it('fails the whole snapshot when one row is malformed', () => {
    const result = peopleSnapshotSchema.safeParse({
      employees: [{ id: 'emp-001', name: 'A', role: 'R', weeklyHours: 41 }],
      rateRecords: [],
    });

    expect(result.success).toBe(false);
  });
});

describe('rate edit payloads (F4)', () => {
  it('requires the fields needed to create a rate', () => {
    expect(
      createRateRecordSchema.safeParse({ employeeId: 'emp-001', validFrom: '2026-03-12' }).success
    ).toBe(false);
  });

  it('lets an update change only the date, only the cost, or both', () => {
    expect(updateRateRecordSchema.parse({})).toEqual({});
    expect(updateRateRecordSchema.parse({ hourlyCost: 99 })).toEqual({ hourlyCost: 99 });
    expect(updateRateRecordSchema.safeParse({ validFrom: 'nope' }).success).toBe(false);
  });
});
