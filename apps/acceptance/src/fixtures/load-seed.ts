import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  isWeeklyHours,
  toIsoDate,
  toMonthKey,
  type Allocation,
  type AllocationId,
  type BreakdownItem,
  type BreakdownItemId,
  type Employee,
  type EmployeeId,
  type Project,
  type ProjectId,
  type RateRecord,
  type RateRecordId,
} from '@repo/shared-common';

/**
 * Load the shipped fixture and narrow it into domain types.
 *
 * The seed has no `updatedAt` on its allocations, R5 needs one to name the most recently edited
 * assignment, so every seeded row is stamped with the same instant. That makes "who caused the
 * overrun" undefined-by-timestamp until somebody edits something, which is honest: nobody did.
 */
export const SEED_TIMESTAMP = '2026-01-01T00:00:00.000Z';
export const SEED_ACTOR = 'seed';

export interface Seed {
  readonly employees: Employee[];
  readonly rateRecords: RateRecord[];
  readonly projects: Project[];
  readonly breakdownItems: BreakdownItem[];
  readonly allocations: Allocation[];
  readonly gridHorizon: { readonly from: string; readonly to: string };
}

interface RawSeed {
  meta: { gridHorizon: { from: string; to: string } };
  employees: { id: string; name: string; role: string; weeklyHours: number }[];
  rateRecords: { id: string; employeeId: string; validFrom: string; hourlyCost: number }[];
  projects: { id: string; name: string; startDate: string; endDate: string }[];
  breakdownItems: { id: string; projectId: string; parentId: string | null; name: string }[];
  allocations: {
    id: string;
    breakdownItemId: string;
    employeeId: string;
    month: string;
    amount: number;
  }[];
}

export const SEED_PATH = fileURLToPath(
  new URL('../../../../fixtures/baseline-seed.json', import.meta.url)
);

export function loadSeed(): Seed {
  const raw = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as RawSeed;

  return {
    gridHorizon: raw.meta.gridHorizon,
    employees: raw.employees.map((employee) => {
      if (!isWeeklyHours(employee.weeklyHours)) {
        throw new Error(`${employee.id} has unsupported weeklyHours ${employee.weeklyHours}`);
      }

      return {
        id: employee.id as EmployeeId,
        name: employee.name,
        role: employee.role,
        weeklyHours: employee.weeklyHours,
      };
    }),
    rateRecords: raw.rateRecords.map((record) => ({
      id: record.id as RateRecordId,
      employeeId: record.employeeId as EmployeeId,
      validFrom: toIsoDate(record.validFrom),
      hourlyCost: record.hourlyCost,
    })),
    projects: raw.projects.map((project) => ({
      id: project.id as ProjectId,
      name: project.name,
      startDate: toIsoDate(project.startDate),
      endDate: toIsoDate(project.endDate),
    })),
    breakdownItems: raw.breakdownItems.map((item) => ({
      id: item.id as BreakdownItemId,
      projectId: item.projectId as ProjectId,
      parentId: item.parentId as BreakdownItemId | null,
      name: item.name,
    })),
    allocations: raw.allocations.map((entry) => ({
      id: entry.id as AllocationId,
      breakdownItemId: entry.breakdownItemId as BreakdownItemId,
      employeeId: entry.employeeId as EmployeeId,
      month: toMonthKey(entry.month),
      amount: entry.amount,
      updatedAt: SEED_TIMESTAMP,
      updatedBy: SEED_ACTOR,
    })),
  };
}
