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

export const MAX_BREAKDOWN_DEPTH = 3;

export type BreakdownEditProblem =
  | { readonly kind: 'unknown-item'; readonly itemId: BreakdownItemId }
  | { readonly kind: 'cycle'; readonly itemId: BreakdownItemId }
  | { readonly kind: 'too-deep'; readonly depth: number }
  | { readonly kind: 'empty-name' };

/**
 * Whether a move is legal. Depth is checked against the *deepest* descendant, not the moved node
 * itself: dragging a two-level subtree under a level-two item would push its leaves to level four.
 */
export function validateMove(
  tree: BreakdownTree,
  itemId: BreakdownItemId,
  nextParentId: BreakdownItemId | null
): BreakdownEditProblem[] {
  const node = tree.byId.get(itemId);

  if (!node) {
    return [{ kind: 'unknown-item', itemId }];
  }

  if (nextParentId === null) {
    return depthProblems(node, 0);
  }

  const nextParent = tree.byId.get(nextParentId);

  if (!nextParent) {
    return [{ kind: 'unknown-item', itemId: nextParentId }];
  }

  if (nextParentId === itemId || isDescendantOf(tree, nextParentId, itemId)) {
    return [{ kind: 'cycle', itemId }];
  }

  return depthProblems(node, nextParent.depth + 1);
}

export function describeBreakdownProblem(problem: BreakdownEditProblem): string {
  switch (problem.kind) {
    case 'unknown-item':
      return `Work package ${problem.itemId} no longer exists.`;
    case 'cycle':
      return 'A work package cannot be moved inside itself.';
    case 'too-deep':
      return `The breakdown is ${MAX_BREAKDOWN_DEPTH} levels deep; this move would make it ${problem.depth}.`;
    case 'empty-name':
      return 'A work package needs a name.';
  }
}

/**
 * R4 — what happens to a leaf's own allocations when a child is inserted beneath it.
 *
 * The brief offers two acceptable resolutions and forbids a third: move the allocations onto the
 * new child, or refuse the insertion with a message. Silent loss is not allowed. This repo moves
 * them, so that adding structure to a plan never costs the planner numbers they already entered —
 * and `reparentAllocations` is the whole of that behaviour, in one testable function.
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

function depthProblems(node: BreakdownNode, nextDepth: number): BreakdownEditProblem[] {
  const subtreeHeight = Math.max(...walk(node).map((descendant) => descendant.depth)) - node.depth;
  const deepestLevel = nextDepth + subtreeHeight + 1;

  return deepestLevel > MAX_BREAKDOWN_DEPTH ? [{ kind: 'too-deep', depth: deepestLevel }] : [];
}
