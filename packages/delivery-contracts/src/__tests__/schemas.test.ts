import { describe, expect, it } from 'vitest';

import {
  allocationSchema,
  breakdownItemSchema,
  createBreakdownItemSchema,
  deliverySnapshotSchema,
  updateBreakdownItemSchema,
  upsertAllocationSchema,
} from '../index';

const ALLOCATION = {
  id: 'alloc-001',
  breakdownItemId: 'wbs-012',
  employeeId: 'emp-001',
  month: '2026-03',
  amount: 0.5,
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'seed',
};

describe('allocationSchema', () => {
  it('accepts the reference cell exactly as the fixture ships it', () => {
    expect(allocationSchema.parse(ALLOCATION).amount).toBe(0.5);
  });

  it('rejects a month that is not YYYY-MM', () => {
    for (const month of ['2026-3', '2026-13', '2026-03-01', 'March 2026']) {
      expect(allocationSchema.safeParse({ ...ALLOCATION, month }).success).toBe(false);
    }
  });

  it('rejects a negative amount — effort cannot be owed back', () => {
    expect(allocationSchema.safeParse({ ...ALLOCATION, amount: -0.1 }).success).toBe(false);
  });

  it('requires the audit fields R5 depends on to name a culprit', () => {
    const { updatedAt: _updatedAt, ...withoutTimestamp } = ALLOCATION;

    expect(allocationSchema.safeParse(withoutTimestamp).success).toBe(false);
  });
});

describe('breakdownItemSchema', () => {
  it('allows a null parent at the root and a string parent below it', () => {
    expect(
      breakdownItemSchema.parse({ id: 'wbs-1', projectId: 'prj-1', parentId: null, name: 'Root' })
        .parentId
    ).toBeNull();

    expect(
      breakdownItemSchema.parse({
        id: 'wbs-2',
        projectId: 'prj-1',
        parentId: 'wbs-1',
        name: 'Child',
      }).parentId
    ).toBe('wbs-1');
  });

  it('rejects an unnamed work package', () => {
    expect(
      breakdownItemSchema.safeParse({ id: 'wbs-1', projectId: 'prj-1', parentId: null, name: '' })
        .success
    ).toBe(false);
  });
});

describe('edit payloads', () => {
  it('accepts zero as an allocation amount — that is how a cell is cleared', () => {
    expect(
      upsertAllocationSchema.parse({
        breakdownItemId: 'wbs-012',
        employeeId: 'emp-001',
        month: '2026-03',
        amount: 0,
        updatedBy: 'usr-1',
      }).amount
    ).toBe(0);
  });

  it('records who made the edit, because R5 has to name them', () => {
    expect(
      upsertAllocationSchema.safeParse({
        breakdownItemId: 'wbs-012',
        employeeId: 'emp-001',
        month: '2026-03',
        amount: 0.5,
      }).success
    ).toBe(false);
  });

  it('lets a work package be created at the root or under a parent', () => {
    expect(
      createBreakdownItemSchema.parse({ projectId: 'prj-1', parentId: null, name: 'New' }).parentId
    ).toBeNull();
  });

  it('lets a move set the parent back to null, distinct from not moving at all', () => {
    expect(updateBreakdownItemSchema.parse({ parentId: null })).toEqual({ parentId: null });
    expect(updateBreakdownItemSchema.parse({ name: 'Renamed' })).toEqual({ name: 'Renamed' });
  });
});

describe('deliverySnapshotSchema', () => {
  it('accepts an empty plan', () => {
    expect(
      deliverySnapshotSchema.parse({ projects: [], breakdownItems: [], allocations: [] })
        .allocations
    ).toEqual([]);
  });
});
