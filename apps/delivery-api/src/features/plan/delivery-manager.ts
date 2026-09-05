import type {
  CreateBreakdownItemInput,
  DeliverySnapshot,
  UpdateBreakdownItemInput,
  UpsertAllocationInput,
} from '@repo/delivery-contracts';
import {
  buildBreakdownTree,
  describeBreakdownProblem,
  reparentAllocations,
  validateMove,
} from '@repo/delivery-domain';
import { ApiError, type DocumentStore } from '@repo/shared-backend';
import type { Allocation, AllocationId, BreakdownItem, BreakdownItemId } from '@repo/shared-common';

/**
 * Everything the service can do to the plan.
 *
 * Two operations have to be atomic, so they live behind one endpoint rather than being composed by
 * the client out of several requests: inserting a child beneath a leaf that already carries
 * allocations (R4), and deleting a subtree. Both call the same pure functions from
 * `@repo/delivery-domain` that the frontend uses, the service does not own a second copy of the
 * rule, only the transaction.
 */
export interface DeliveryManager {
  snapshot(): DeliverySnapshot;
  /** Returns `null` when the edit cleared the cell. */
  upsertAllocation(input: UpsertAllocationInput): Promise<Allocation | null>;
  createBreakdownItem(input: CreateBreakdownItemInput): Promise<BreakdownItem>;
  updateBreakdownItem(
    itemId: BreakdownItemId,
    input: UpdateBreakdownItemInput
  ): Promise<BreakdownItem>;
  deleteBreakdownItem(itemId: BreakdownItemId): Promise<void>;
}

export function createDeliveryManager(store: DocumentStore<DeliverySnapshot>): DeliveryManager {
  const nextId = (existing: readonly { id: string }[], prefix: string): string => {
    const highest = existing.reduce((max, entry) => {
      const numeric = Number(entry.id.replace(/\D/g, ''));

      return Number.isFinite(numeric) && numeric > max ? numeric : max;
    }, 0);

    return `${prefix}-${String(highest + 1).padStart(3, '0')}`;
  };

  const requireItem = (snapshot: DeliverySnapshot, itemId: BreakdownItemId): BreakdownItem => {
    const item = snapshot.breakdownItems.find((candidate) => candidate.id === itemId);

    if (!item) {
      throw ApiError.notFound(`No work package ${itemId}`);
    }

    return item;
  };

  const hasChildren = (snapshot: DeliverySnapshot, itemId: BreakdownItemId): boolean =>
    snapshot.breakdownItems.some((candidate) => candidate.parentId === itemId);

  return {
    snapshot: () => store.read(),

    async upsertAllocation(input) {
      const current = store.read();
      const item = requireItem(current, input.breakdownItemId);

      // R4: a parent's effort comes from its children, so it cannot be typed into directly.
      if (hasChildren(current, item.id)) {
        throw ApiError.badRequest(
          `"${item.name}" is derived from its children and cannot be edited directly.`
        );
      }

      const existing = current.allocations.find(
        (allocation) =>
          allocation.breakdownItemId === input.breakdownItemId &&
          allocation.employeeId === input.employeeId &&
          allocation.month === input.month
      );

      // Zero clears the cell. Keeping a zero row would leave the person on the grid for ever.
      if (input.amount === 0) {
        if (existing) {
          await store.update((snapshot) => ({
            ...snapshot,
            allocations: snapshot.allocations.filter((allocation) => allocation.id !== existing.id),
          }));
        }

        return null;
      }

      const updated: Allocation = {
        id: existing?.id ?? (nextId(current.allocations, 'alloc') as AllocationId),
        breakdownItemId: input.breakdownItemId,
        employeeId: input.employeeId,
        month: input.month,
        amount: input.amount,
        updatedAt: new Date().toISOString(),
        updatedBy: input.updatedBy,
      };

      await store.update((snapshot) => ({
        ...snapshot,
        allocations: existing
          ? snapshot.allocations.map((allocation) =>
              allocation.id === existing.id ? updated : allocation
            )
          : [...snapshot.allocations, updated],
      }));

      return updated;
    },

    /**
     * R4, inserting a child beneath a leaf that carries allocations moves those allocations onto
     * the new child. Both writes happen in one store update, so the plan is never briefly missing
     * them, and nothing is ever silently lost.
     */
    async createBreakdownItem(input) {
      const current = store.read();

      if (input.parentId !== null) {
        const parent = requireItem(current, input.parentId);

        if (parent.projectId !== input.projectId) {
          throw ApiError.badRequest('A work package cannot be created under another project.');
        }
      }

      const created: BreakdownItem = {
        id: nextId(current.breakdownItems, 'wbs') as BreakdownItemId,
        projectId: input.projectId,
        parentId: input.parentId,
        name: input.name,
      };

      const movedIds = new Set(
        (input.parentId === null
          ? []
          : reparentAllocations(current.allocations, input.parentId, created.id)
        ).map((allocation) => allocation.id)
      );

      await store.update((snapshot) => ({
        ...snapshot,
        breakdownItems: [...snapshot.breakdownItems, created],
        allocations: snapshot.allocations.map((allocation) =>
          movedIds.has(allocation.id) ? { ...allocation, breakdownItemId: created.id } : allocation
        ),
      }));

      return created;
    },

    async updateBreakdownItem(itemId, input) {
      const current = store.read();
      const existing = requireItem(current, itemId);

      if (input.parentId !== undefined && input.parentId !== existing.parentId) {
        const problems = validateMove(
          buildBreakdownTree(current.breakdownItems, existing.projectId),
          itemId,
          input.parentId
        );

        if (problems.length > 0) {
          throw ApiError.badRequest(
            'That move is not allowed.',
            problems.map(describeBreakdownProblem)
          );
        }
      }

      const updated: BreakdownItem = {
        ...existing,
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
      };

      await store.update((snapshot) => ({
        ...snapshot,
        breakdownItems: snapshot.breakdownItems.map((item) =>
          item.id === itemId ? updated : item
        ),
      }));

      return updated;
    },

    /** Deleting a work package takes its whole subtree and everything allocated inside it. */
    async deleteBreakdownItem(itemId) {
      const current = store.read();

      requireItem(current, itemId);

      const doomed = collectSubtree(current.breakdownItems, itemId);

      await store.update((snapshot) => ({
        ...snapshot,
        breakdownItems: snapshot.breakdownItems.filter((item) => !doomed.has(item.id)),
        allocations: snapshot.allocations.filter(
          (allocation) => !doomed.has(allocation.breakdownItemId)
        ),
      }));
    },
  };
}

function collectSubtree(
  items: readonly BreakdownItem[],
  rootId: BreakdownItemId
): ReadonlySet<BreakdownItemId> {
  const doomed = new Set<BreakdownItemId>([rootId]);
  let grew = true;

  while (grew) {
    grew = false;

    for (const item of items) {
      if (item.parentId && doomed.has(item.parentId) && !doomed.has(item.id)) {
        doomed.add(item.id);
        grew = true;
      }
    }
  }

  return doomed;
}
