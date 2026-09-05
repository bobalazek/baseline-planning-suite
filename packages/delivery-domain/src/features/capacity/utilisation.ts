import type { MonthUtilisation } from '@repo/delivery-contracts';
import {
  CAPACITY_PERSON_MONTHS,
  type Allocation,
  type BreakdownItem,
  type BreakdownItemId,
  type EmployeeId,
  type MonthKey,
  type ProjectId,
} from '@repo/shared-common';

/**
 * Cross-project capacity (R5).
 *
 * Built from *all* allocations, never from the project currently on screen: R5 sums across every
 * project "including ones not currently open", and scoping this to the open project is the easiest
 * way to ship a plan that looks fine and is not.
 *
 * Capacity is the constant 1 because the canonical unit is the person-month, so the comparison
 * needs nothing from People.
 */
export interface UtilisationIndex {
  readonly byEmployee: ReadonlyMap<EmployeeId, ReadonlyMap<MonthKey, MonthUtilisation>>;
  /** The most recently edited allocation contributing to a person-month, R5's "who caused it". */
  readonly culpritByCell: ReadonlyMap<string, Allocation>;
}

export function utilisationCellKey(employeeId: EmployeeId, month: MonthKey): string {
  return `${employeeId}:${month}`;
}

export function buildUtilisationIndex(
  allocations: readonly Allocation[],
  breakdownItems: readonly BreakdownItem[]
): UtilisationIndex {
  const projectByItem = new Map<BreakdownItemId, ProjectId>(
    breakdownItems.map((item) => [item.id, item.projectId])
  );

  const totals = new Map<EmployeeId, Map<MonthKey, { sum: number; projects: Set<ProjectId> }>>();
  const culpritByCell = new Map<string, Allocation>();

  for (const allocation of allocations) {
    const months = totals.get(allocation.employeeId) ?? new Map();
    const cell = months.get(allocation.month) ?? { sum: 0, projects: new Set<ProjectId>() };

    cell.sum += allocation.amount;

    const projectId = projectByItem.get(allocation.breakdownItemId);

    if (projectId) {
      cell.projects.add(projectId);
    }

    months.set(allocation.month, cell);
    totals.set(allocation.employeeId, months);

    const key = utilisationCellKey(allocation.employeeId, allocation.month);
    const incumbent = culpritByCell.get(key);

    if (!incumbent || isMoreRecent(allocation, incumbent)) {
      culpritByCell.set(key, allocation);
    }
  }

  const byEmployee = new Map<EmployeeId, ReadonlyMap<MonthKey, MonthUtilisation>>();

  for (const [employeeId, months] of totals) {
    const utilisationByMonth = new Map<MonthKey, MonthUtilisation>();

    for (const [month, cell] of months) {
      utilisationByMonth.set(month, {
        month,
        personMonths: cell.sum,
        overCapacityBy: Math.max(0, cell.sum - CAPACITY_PERSON_MONTHS),
        projectCount: cell.projects.size,
      });
    }

    byEmployee.set(employeeId, utilisationByMonth);
  }

  return { byEmployee, culpritByCell };
}

export function utilisationFor(
  index: UtilisationIndex,
  employeeId: EmployeeId
): readonly MonthUtilisation[] {
  const months = index.byEmployee.get(employeeId);

  if (!months) {
    return [];
  }

  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function utilisationAt(
  index: UtilisationIndex,
  employeeId: EmployeeId,
  month: MonthKey
): MonthUtilisation | undefined {
  return index.byEmployee.get(employeeId)?.get(month);
}

export function oversubscribedEmployeeIds(index: UtilisationIndex): readonly EmployeeId[] {
  const ids: EmployeeId[] = [];

  for (const [employeeId, months] of index.byEmployee) {
    for (const utilisation of months.values()) {
      if (utilisation.overCapacityBy > 0) {
        ids.push(employeeId);
        break;
      }
    }
  }

  return ids.sort();
}

/**
 * The assignment Delivery names when someone goes over capacity: the most recently edited
 * allocation contributing to that person-month. `updatedAt` is an ISO timestamp, so string order is
 * chronological order; ids break the tie when two edits land in the same millisecond.
 */
export function culpritFor(
  index: UtilisationIndex,
  employeeId: EmployeeId,
  month: MonthKey
): Allocation | undefined {
  return index.culpritByCell.get(utilisationCellKey(employeeId, month));
}

function isMoreRecent(candidate: Allocation, incumbent: Allocation): boolean {
  if (candidate.updatedAt === incumbent.updatedAt) {
    return candidate.id > incumbent.id;
  }

  return candidate.updatedAt > incumbent.updatedAt;
}
