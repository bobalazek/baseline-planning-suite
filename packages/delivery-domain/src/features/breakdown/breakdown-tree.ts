import type { Allocation, BreakdownItem, BreakdownItemId, ProjectId } from '@repo/shared-common';

/** One node of the work breakdown, with its children resolved. The tree is three levels deep. */
export interface BreakdownNode {
  readonly item: BreakdownItem;
  readonly depth: number;
  readonly children: readonly BreakdownNode[];
}

export interface BreakdownTree {
  readonly roots: readonly BreakdownNode[];
  readonly byId: ReadonlyMap<BreakdownItemId, BreakdownNode>;
}

/**
 * Build the tree for one project. Items whose parent is missing are dropped rather than promoted to
 * roots: a dangling parent means the data is wrong, and silently reparenting hides it.
 */
export function buildBreakdownTree(
  items: readonly BreakdownItem[],
  projectId: ProjectId
): BreakdownTree {
  const scoped = items.filter((item) => item.projectId === projectId);
  const childrenByParent = new Map<BreakdownItemId | null, BreakdownItem[]>();

  for (const item of scoped) {
    const siblings = childrenByParent.get(item.parentId) ?? [];

    siblings.push(item);
    childrenByParent.set(item.parentId, siblings);
  }

  const byId = new Map<BreakdownItemId, BreakdownNode>();

  const build = (item: BreakdownItem, depth: number): BreakdownNode => {
    const node: BreakdownNode = {
      item,
      depth,
      children: (childrenByParent.get(item.id) ?? [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((child) => build(child, depth + 1)),
    };

    byId.set(item.id, node);

    return node;
  };

  const roots = (childrenByParent.get(null) ?? [])
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => build(item, 0));

  return { roots, byId };
}

export function isLeaf(node: BreakdownNode): boolean {
  return node.children.length === 0;
}

/** The node and everything beneath it, depth-first. */
export function walk(node: BreakdownNode): BreakdownNode[] {
  return [node, ...node.children.flatMap(walk)];
}

export function leavesOf(node: BreakdownNode): BreakdownNode[] {
  return walk(node).filter(isLeaf);
}

export function flatten(tree: BreakdownTree): BreakdownNode[] {
  return tree.roots.flatMap(walk);
}

/** Whether `candidateParentId` sits inside the subtree of `itemId` — a move that would cycle. */
export function isDescendantOf(
  tree: BreakdownTree,
  candidateParentId: BreakdownItemId,
  itemId: BreakdownItemId
): boolean {
  const node = tree.byId.get(itemId);

  return node ? walk(node).some((descendant) => descendant.item.id === candidateParentId) : false;
}

/**
 * The shipped fixture is three levels deep, and the brief describes it that way — but depth is
 * **not** capped here, deliberately.
 *
 * R4 is about inserting a child beneath a leaf that already carries allocations. Every one of the
 * fixture's 53 leaves sits at the third level, and 51 of them carry allocations. A hard cap of
 * three would therefore make R4 unreachable for every cell in the dataset, which cannot be what a
 * rule the brief spells out is meant to do. Depth is a property of the plan, not an invariant.
 *
 * A cap would be one comparison in `validateMove` if a client ever wanted one.
 */
export type BreakdownEditProblem =
  | { readonly kind: 'unknown-item'; readonly itemId: BreakdownItemId }
  | { readonly kind: 'cycle'; readonly itemId: BreakdownItemId };

/**
 * Whether a move is legal. The only illegal move is one that would put a work package inside its
 * own subtree, because that detaches the subtree from the tree entirely.
 */
export function validateMove(
  tree: BreakdownTree,
  itemId: BreakdownItemId,
  nextParentId: BreakdownItemId | null
): BreakdownEditProblem[] {
  if (!tree.byId.has(itemId)) {
    return [{ kind: 'unknown-item', itemId }];
  }

  if (nextParentId === null) {
    return [];
  }

  if (!tree.byId.has(nextParentId)) {
    return [{ kind: 'unknown-item', itemId: nextParentId }];
  }

  if (nextParentId === itemId || isDescendantOf(tree, nextParentId, itemId)) {
    return [{ kind: 'cycle', itemId }];
  }

  return [];
}

export function describeBreakdownProblem(problem: BreakdownEditProblem): string {
  switch (problem.kind) {
    case 'unknown-item':
      return `Work package ${problem.itemId} no longer exists.`;
    case 'cycle':
      return 'A work package cannot be moved inside itself.';
  }
}

/**
 * R4 — what happens to a leaf's own allocations when a child is inserted beneath it.
 *
 * The brief offers two acceptable resolutions and forbids a third: move the allocations onto the
 * new child, or refuse the insertion with a message. Silent loss is not allowed. This repo moves
 * them, so that adding structure to a plan never costs the planner numbers they already entered —
 * and this function is the whole of that behaviour, in one testable place.
 */
export function reparentAllocations(
  allocations: readonly Allocation[],
  fromItemId: BreakdownItemId,
  toItemId: BreakdownItemId
): Allocation[] {
  return allocations
    .filter((allocation) => allocation.breakdownItemId === fromItemId)
    .map((allocation) => ({ ...allocation, breakdownItemId: toItemId }));
}
