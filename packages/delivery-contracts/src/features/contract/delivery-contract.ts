import { defineContract, defineEvent } from '@repo/platform';
import type { EmployeeId, MonthKey } from '@repo/shared-common';

/**
 * How much of one person's month is already spoken for, **across every project** — including
 * projects the viewer does not have open, which is the entire point of R5. Capacity only means
 * something when every project is counted together.
 *
 * The figure is in person-months, the canonical unit, so `personMonths > 1` *is* the over-capacity
 * test. No conversion, and nothing from People, is needed to make that comparison.
 */
export interface MonthUtilisation {
  readonly month: MonthKey;
  readonly personMonths: number;
  /** Person-months beyond capacity. Zero when within capacity; never negative. */
  readonly overCapacityBy: number;
  /** How many projects contribute — People shows this to explain a number the planner can't see. */
  readonly projectCount: number;
}

/**
 * What the Delivery team publishes.
 *
 * People consumes it to flag oversubscribed staff (R5). Delivery does not publish allocations,
 * breakdown items or projects: People has no business reading a plan, only the load it puts on a
 * person.
 */
export interface DeliveryContract {
  readonly version: string;

  /** Every month in which this person carries load. Ascending, and sparse by design. */
  utilisationFor(employeeId: EmployeeId): readonly MonthUtilisation[];
  utilisationAt(employeeId: EmployeeId, month: MonthKey): MonthUtilisation | undefined;
  /** Ids of everyone currently over capacity in at least one month. */
  oversubscribedEmployeeIds(): readonly EmployeeId[];
}

export const DELIVERY_CONTRACT_VERSION = '1.0';

export const DELIVERY_CONTRACT = defineContract<DeliveryContract>(
  'delivery/utilisation',
  DELIVERY_CONTRACT_VERSION
);

/** Published after any edit that changes how loaded somebody is. Ids only, never amounts. */
export const DELIVERY_ALLOCATIONS_CHANGED = defineEvent<{
  readonly employeeIds: readonly EmployeeId[];
  readonly months: readonly MonthKey[];
}>('delivery/allocations-changed');
