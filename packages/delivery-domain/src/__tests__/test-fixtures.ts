import {
  toMonthKey,
  type Allocation,
  type AllocationId,
  type BreakdownItem,
  type BreakdownItemId,
  type EmployeeId,
  type MonthKey,
  type ProjectId,
} from '@repo/shared-common';

export const PROJECT = 'prj-1' as ProjectId;
export const OTHER_PROJECT = 'prj-2' as ProjectId;

export function item(
  id: string,
  parentId: string | null,
  name: string,
  projectId = PROJECT
): BreakdownItem {
  return {
    id: id as BreakdownItemId,
    projectId,
    parentId: parentId as BreakdownItemId | null,
    name,
  };
}

let allocationCounter = 0;

export function allocation(
  itemId: string,
  employeeId: string,
  month: string,
  amount: number,
  updatedAt = '2026-01-01T00:00:00.000Z'
): Allocation {
  allocationCounter += 1;

  return {
    id: `alloc-${allocationCounter}` as AllocationId,
    breakdownItemId: itemId as BreakdownItemId,
    employeeId: employeeId as EmployeeId,
    month: toMonthKey(month),
    amount,
    updatedAt,
    updatedBy: 'usr-test',
  };
}

export const MONTHS: MonthKey[] = ['2026-04', '2026-05', '2026-06'].map(toMonthKey);

export const NAMES: Record<string, string> = {
  'emp-001': 'Adaeze Okafor',
  'emp-002': 'Bo Andersen',
  'emp-003': 'Chen Wei',
};

export function employeeName(employeeId: EmployeeId): string {
  return NAMES[employeeId] ?? employeeId;
}
