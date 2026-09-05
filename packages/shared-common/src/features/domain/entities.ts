import type { IsoDate, MonthKey } from '../calendar/month';

/**
 * The five entities of §3.2 of the brief, and the branded ids that keep them from being mixed up.
 *
 * These live in `shared-common` because both teams have to agree on what an `EmployeeId` is in
 * order to talk at all — but note what is *not* here: no `hourlyCost` on anything Delivery reads,
 * and no `amount` on anything People reads. Each side owns its own entities; this module owns the
 * vocabulary.
 */
export type EmployeeId = string & { readonly __brand: 'EmployeeId' };
export type RateRecordId = string & { readonly __brand: 'RateRecordId' };
export type ProjectId = string & { readonly __brand: 'ProjectId' };
export type BreakdownItemId = string & { readonly __brand: 'BreakdownItemId' };
export type AllocationId = string & { readonly __brand: 'AllocationId' };

/** Contracted hours per week. The brief fixes the domain to exactly these three. */
export const WEEKLY_HOURS_OPTIONS = [40, 32, 20] as const;

export type WeeklyHours = (typeof WEEKLY_HOURS_OPTIONS)[number];

export function isWeeklyHours(value: number): value is WeeklyHours {
  return (WEEKLY_HOURS_OPTIONS as readonly number[]).includes(value);
}

/** Owned by People. */
export interface Employee {
  readonly id: EmployeeId;
  readonly name: string;
  readonly role: string;
  readonly weeklyHours: WeeklyHours;
}

/**
 * Owned by People. A rate applies from `validFrom` until the next record for the same employee
 * begins; the last one has no end. There is deliberately no `validTo` field — an end date is a
 * derived fact, and storing it is how two records end up disagreeing about the same day.
 */
export interface RateRecord {
  readonly id: RateRecordId;
  readonly employeeId: EmployeeId;
  readonly validFrom: IsoDate;
  readonly hourlyCost: number;
}

/** Owned by Delivery. */
export interface Project {
  readonly id: ProjectId;
  readonly name: string;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
}

/** Owned by Delivery. `parentId` is null at the root; the tree is three levels deep. */
export interface BreakdownItem {
  readonly id: BreakdownItemId;
  readonly projectId: ProjectId;
  readonly parentId: BreakdownItemId | null;
  readonly name: string;
}

/**
 * Owned by Delivery. `amount` is in **person-months** — the single canonical unit
 * (see docs/project/decisions/0001-canonical-unit.md).
 *
 * `updatedAt` and `updatedBy` are not bookkeeping: R5 requires naming "the most recently edited
 * allocation contributing to that person-month" when someone goes over capacity.
 */
export interface Allocation {
  readonly id: AllocationId;
  readonly breakdownItemId: BreakdownItemId;
  readonly employeeId: EmployeeId;
  readonly month: MonthKey;
  readonly amount: number;
  readonly updatedAt: string;
  readonly updatedBy: string;
}
