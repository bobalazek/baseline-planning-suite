import type { CreateBreakdownItemInput, UpdateBreakdownItemInput, UpsertAllocationInput } from '@repo/delivery-contracts';
import { type UtilisationIndex } from '@repo/delivery-domain';
import type { Unsubscribe } from '@repo/platform';
import type { Allocation, BreakdownItem, BreakdownItemId, EmployeeId, MonthKey, Project } from '@repo/shared-common';
import type { DeliveryClient } from './delivery-client';
export interface PlanChange {
    readonly employeeIds: readonly EmployeeId[];
    readonly months: readonly MonthKey[];
}
/**
 * An immutable view of the whole plan. A new object is produced on every change and the same one is
 * returned in between, which is exactly the contract `useSyncExternalStore` wants — so React
 * re-renders on a real change and nothing needs a hand-rolled revision counter as a dependency.
 */
export interface PlanSnapshot {
    readonly revision: number;
    readonly projects: readonly Project[];
    readonly breakdownItems: readonly BreakdownItem[];
    readonly allocations: readonly Allocation[];
    readonly utilisation: UtilisationIndex;
}
/**
 * Delivery's hydrated projection of the whole plan — every project, not just the one on screen.
 *
 * That is not laziness: R5 says capacity is summed across every project "including ones not
 * currently open", so a projection scoped to the visible project would give the wrong answer by
 * construction. The utilisation index is rebuilt from the full set on every change.
 */
export interface DeliveryStore {
    readonly ready: Promise<void>;
    snapshot(): PlanSnapshot;
    projects(): readonly Project[];
    breakdownItems(): readonly BreakdownItem[];
    allocations(): readonly Allocation[];
    utilisation(): UtilisationIndex;
    findItem(itemId: BreakdownItemId): BreakdownItem | undefined;
    subscribe(listener: (change: PlanChange) => void): Unsubscribe;
    upsertAllocation(input: UpsertAllocationInput): Promise<void>;
    createBreakdownItem(input: CreateBreakdownItemInput): Promise<BreakdownItem>;
    updateBreakdownItem(itemId: BreakdownItemId, input: UpdateBreakdownItemInput): Promise<void>;
    deleteBreakdownItem(itemId: BreakdownItemId): Promise<void>;
}
export declare function createDeliveryStore(client: DeliveryClient): DeliveryStore;
