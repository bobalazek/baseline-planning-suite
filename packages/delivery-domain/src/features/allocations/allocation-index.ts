import type { Allocation, BreakdownItemId, EmployeeId, MonthKey } from '@repo/shared-common';

/**
 * Lookup for the grid: which people appear on a work package, and what one of them has in one
 * month. Built once per render pass rather than scanned per cell — a 90-node tree over a
 * twelve-month horizon asks this question several thousand times.
 */
export interface AllocationIndex {
  allocationAt(
    itemId: BreakdownItemId,
    employeeId: EmployeeId,
    month: MonthKey
  ): Allocation | undefined;
  employeesOn(itemId: BreakdownItemId): readonly EmployeeId[];
  allocationsOn(itemId: BreakdownItemId): readonly Allocation[];
}

export function buildAllocationIndex(allocations: readonly Allocation[]): AllocationIndex {
  const byCell = new Map<string, Allocation>();
  const byItem = new Map<BreakdownItemId, Allocation[]>();
  const employeesByItem = new Map<BreakdownItemId, Set<EmployeeId>>();

  for (const allocation of allocations) {
    byCell.set(cellKey(allocation.breakdownItemId, allocation.employeeId, allocation.month), allocation);

    const onItem = byItem.get(allocation.breakdownItemId) ?? [];

    onItem.push(allocation);
    byItem.set(allocation.breakdownItemId, onItem);

    const employees = employeesByItem.get(allocation.breakdownItemId) ?? new Set<EmployeeId>();

    employees.add(allocation.employeeId);
    employeesByItem.set(allocation.breakdownItemId, employees);
  }

  return {
    allocationAt: (itemId, employeeId, month) => byCell.get(cellKey(itemId, employeeId, month)),
    employeesOn: (itemId) => [...(employeesByItem.get(itemId) ?? [])],
    allocationsOn: (itemId) => byItem.get(itemId) ?? [],
  };
}

function cellKey(itemId: BreakdownItemId, employeeId: EmployeeId, month: MonthKey): string {
  return `${itemId}|${employeeId}|${month}`;
}
