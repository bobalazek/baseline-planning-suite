import type {
  CreateBreakdownItemInput,
  UpdateBreakdownItemInput,
  UpsertAllocationInput,
} from '@repo/delivery-contracts';
import { buildUtilisationIndex, type UtilisationIndex } from '@repo/delivery-domain';
import type { Unsubscribe } from '@repo/platform';
import type {
  Allocation,
  BreakdownItem,
  BreakdownItemId,
  EmployeeId,
  MonthKey,
  Project,
} from '@repo/shared-common';

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
  updateBreakdownItem(
    itemId: BreakdownItemId,
    input: UpdateBreakdownItemInput
  ): Promise<void>;
  deleteBreakdownItem(itemId: BreakdownItemId): Promise<void>;
}

export function createDeliveryStore(client: DeliveryClient): DeliveryStore {
  let snapshot: PlanSnapshot = {
    revision: 0,
    projects: [],
    breakdownItems: [],
    allocations: [],
    utilisation: buildUtilisationIndex([], []),
  };

  const listeners = new Set<(change: PlanChange) => void>();

  const hydrate = async (): Promise<void> => {
    const fetched = await client.fetchSnapshot();
    const breakdownItems = fetched.breakdownItems;
    const allocations = fetched.allocations;

    snapshot = {
      revision: snapshot.revision + 1,
      projects: [...fetched.projects].sort((a, b) => a.name.localeCompare(b.name)),
      breakdownItems,
      allocations,
      utilisation: buildUtilisationIndex(allocations, breakdownItems),
    };
  };

  const announce = (change: PlanChange): void => {
    for (const listener of [...listeners]) {
      listener(change);
    }
  };

  const refreshAfter = async (change: PlanChange): Promise<void> => {
    await hydrate();
    announce(change);
  };

  return {
    ready: hydrate(),

    snapshot: () => snapshot,
    projects: () => snapshot.projects,
    breakdownItems: () => snapshot.breakdownItems,
    allocations: () => snapshot.allocations,
    utilisation: () => snapshot.utilisation,
    findItem: (itemId) => snapshot.breakdownItems.find((item) => item.id === itemId),

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    async upsertAllocation(input) {
      await client.upsertAllocation(input);
      await refreshAfter({ employeeIds: [input.employeeId], months: [input.month] });
    },

    async createBreakdownItem(input) {
      const created = await client.createBreakdownItem(input);

      // R4 may have moved allocations onto the new child, so the change is plan-wide.
      await refreshAfter({ employeeIds: [], months: [] });

      return created;
    },

    async updateBreakdownItem(itemId, input) {
      await client.updateBreakdownItem(itemId, input);
      await refreshAfter({ employeeIds: [], months: [] });
    },

    async deleteBreakdownItem(itemId) {
      await client.deleteBreakdownItem(itemId);
      await refreshAfter({ employeeIds: [], months: [] });
    },
  };
}
