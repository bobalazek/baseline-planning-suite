import { toMonthKey, type EmployeeId } from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import {
  buildUtilisationIndex,
  culpritFor,
  oversubscribedEmployeeIds,
  utilisationAt,
  utilisationFor,
} from '../index';
import { allocation, item, OTHER_PROJECT, PROJECT } from './test-fixtures';

const ITEMS = [
  item('wbs-1', null, 'Ledger migration', PROJECT),
  item('wbs-9', null, 'Reporting platform', OTHER_PROJECT),
];

const APRIL = toMonthKey('2026-04');
const OKAFOR = 'emp-001' as EmployeeId;

describe('buildUtilisationIndex (R5)', () => {
  it('sums a person across every project, not just the one on screen', () => {
    const index = buildUtilisationIndex(
      [
        allocation('wbs-1', 'emp-001', '2026-04', 0.6),
        allocation('wbs-9', 'emp-001', '2026-04', 0.6),
      ],
      ITEMS
    );

    const april = utilisationAt(index, OKAFOR, APRIL);

    expect(april?.personMonths).toBeCloseTo(1.2, 10);
    expect(april?.projectCount).toBe(2);
  });

  it('flags over capacity only past 100% of a person-month', () => {
    const index = buildUtilisationIndex(
      [
        allocation('wbs-1', 'emp-001', '2026-04', 0.6),
        allocation('wbs-9', 'emp-001', '2026-04', 0.6),
        allocation('wbs-1', 'emp-002', '2026-04', 1),
      ],
      ITEMS
    );

    expect(utilisationAt(index, OKAFOR, APRIL)?.overCapacityBy).toBeCloseTo(0.2, 10);
    // Exactly one person-month is full, not over.
    expect(utilisationAt(index, 'emp-002' as EmployeeId, APRIL)?.overCapacityBy).toBe(0);
    expect(oversubscribedEmployeeIds(index)).toEqual(['emp-001']);
  });

  it('needs nothing from People — capacity is 1 person-month by definition', () => {
    const index = buildUtilisationIndex([allocation('wbs-1', 'emp-003', '2026-04', 1.5)], ITEMS);

    expect(utilisationAt(index, 'emp-003' as EmployeeId, APRIL)?.overCapacityBy).toBeCloseTo(0.5, 10);
  });

  it('reports months in ascending order and stays sparse', () => {
    const index = buildUtilisationIndex(
      [
        allocation('wbs-1', 'emp-001', '2026-06', 0.2),
        allocation('wbs-1', 'emp-001', '2026-04', 0.3),
      ],
      ITEMS
    );

    expect(utilisationFor(index, OKAFOR).map((entry) => entry.month)).toEqual(['2026-04', '2026-06']);
  });

  it('returns nothing for somebody with no load at all', () => {
    const index = buildUtilisationIndex([], ITEMS);

    expect(utilisationFor(index, OKAFOR)).toEqual([]);
    expect(utilisationAt(index, OKAFOR, APRIL)).toBeUndefined();
    expect(oversubscribedEmployeeIds(index)).toEqual([]);
  });
});

describe('culpritFor (R5: "the most recently edited allocation")', () => {
  it('names the latest edit contributing to that person-month', () => {
    const older = allocation('wbs-1', 'emp-001', '2026-04', 0.6, '2026-02-01T09:00:00.000Z');
    const newer = allocation('wbs-9', 'emp-001', '2026-04', 0.6, '2026-02-01T10:00:00.000Z');

    const index = buildUtilisationIndex([older, newer], ITEMS);

    expect(culpritFor(index, OKAFOR, APRIL)?.id).toBe(newer.id);
  });

  it('is not fooled by the order allocations arrive in', () => {
    const older = allocation('wbs-1', 'emp-001', '2026-04', 0.6, '2026-02-01T09:00:00.000Z');
    const newer = allocation('wbs-9', 'emp-001', '2026-04', 0.6, '2026-02-01T10:00:00.000Z');

    expect(culpritFor(buildUtilisationIndex([newer, older], ITEMS), OKAFOR, APRIL)?.id).toBe(newer.id);
  });

  it('breaks a same-timestamp tie deterministically', () => {
    const first = allocation('wbs-1', 'emp-001', '2026-04', 0.6, '2026-02-01T09:00:00.000Z');
    const second = allocation('wbs-9', 'emp-001', '2026-04', 0.6, '2026-02-01T09:00:00.000Z');
    const expected = first.id > second.id ? first.id : second.id;

    expect(culpritFor(buildUtilisationIndex([first, second], ITEMS), OKAFOR, APRIL)?.id).toBe(expected);
  });

  it('is undefined for a cell nobody has touched', () => {
    expect(culpritFor(buildUtilisationIndex([], ITEMS), OKAFOR, APRIL)).toBeUndefined();
  });
});
