import type { BreakdownItemId } from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import {
  buildBreakdownTree,
  describeBreakdownProblem,
  flatten,
  isDescendantOf,
  isLeaf,
  leavesOf,
  reparentAllocations,
  validateMove,
} from '../index';
import { allocation, item, OTHER_PROJECT, PROJECT } from './test-fixtures';

const ITEMS = [
  item('wbs-1', null, 'Ledger migration'),
  item('wbs-2', 'wbs-1', 'Discovery'),
  item('wbs-3', 'wbs-2', 'Design'),
  item('wbs-4', 'wbs-2', 'Analysis'),
  item('wbs-5', null, 'Reporting cut-over'),
  item('wbs-6', 'wbs-5', 'Parallel run'),
  item('wbs-7', 'wbs-6', 'Sign-off'),
  item('wbs-9', null, 'Somebody else"s tree', OTHER_PROJECT),
];

const TREE = buildBreakdownTree(ITEMS, PROJECT);

describe('buildBreakdownTree', () => {
  it('keeps only the project asked for', () => {
    expect(flatten(TREE).map((node) => node.item.id)).not.toContain('wbs-9');
  });

  it('nests three levels deep and records depth', () => {
    expect(TREE.byId.get('wbs-1' as BreakdownItemId)?.depth).toBe(0);
    expect(TREE.byId.get('wbs-2' as BreakdownItemId)?.depth).toBe(1);
    expect(TREE.byId.get('wbs-3' as BreakdownItemId)?.depth).toBe(2);
  });

  it('orders siblings by name, so the tree is stable between renders', () => {
    const discovery = TREE.byId.get('wbs-2' as BreakdownItemId);

    expect(discovery?.children.map((child) => child.item.name)).toEqual(['Analysis', 'Design']);
  });

  it('identifies leaves and lists them', () => {
    expect(isLeaf(TREE.byId.get('wbs-3' as BreakdownItemId)!)).toBe(true);
    expect(isLeaf(TREE.byId.get('wbs-1' as BreakdownItemId)!)).toBe(false);
    expect(leavesOf(TREE.byId.get('wbs-1' as BreakdownItemId)!).map((n) => n.item.id)).toEqual([
      'wbs-4',
      'wbs-3',
    ]);
  });

  it('drops an item whose parent is missing rather than promoting it to a root', () => {
    const orphaned = buildBreakdownTree([item('wbs-x', 'nope', 'Orphan')], PROJECT);

    expect(orphaned.roots).toEqual([]);
  });
});

describe('validateMove (F5)', () => {
  it('accepts a legal move', () => {
    expect(validateMove(TREE, 'wbs-3' as BreakdownItemId, 'wbs-5' as BreakdownItemId)).toEqual([]);
  });

  it('accepts promotion to a root', () => {
    expect(validateMove(TREE, 'wbs-2' as BreakdownItemId, null)).toEqual([]);
  });

  it('refuses moving an item into itself', () => {
    expect(validateMove(TREE, 'wbs-1' as BreakdownItemId, 'wbs-1' as BreakdownItemId)).toEqual([
      { kind: 'cycle', itemId: 'wbs-1' },
    ]);
  });

  it('refuses moving an item into its own descendant', () => {
    expect(validateMove(TREE, 'wbs-1' as BreakdownItemId, 'wbs-3' as BreakdownItemId)).toEqual([
      { kind: 'cycle', itemId: 'wbs-1' },
    ]);
  });

  it('refuses a move that would push a leaf past three levels', () => {
    // wbs-7 is already the third level, so anything hung beneath it lands on a fourth.
    const problems = validateMove(TREE, 'wbs-4' as BreakdownItemId, 'wbs-7' as BreakdownItemId);

    expect(problems).toEqual([{ kind: 'too-deep', depth: 4 }]);
    expect(describeBreakdownProblem(problems[0]!)).toContain('4');
  });

  it('measures depth from the deepest descendant, not the node being dragged', () => {
    // wbs-2 is only one level down, but it carries children, so moving it under a level-2 item
    // would put its leaves on level 4.
    expect(validateMove(TREE, 'wbs-2' as BreakdownItemId, 'wbs-6' as BreakdownItemId)).toEqual([
      { kind: 'too-deep', depth: 4 },
    ]);

    // The same item moves happily one level higher.
    expect(validateMove(TREE, 'wbs-2' as BreakdownItemId, 'wbs-5' as BreakdownItemId)).toEqual([]);
  });

  it('reports an unknown item on both sides of the move', () => {
    expect(validateMove(TREE, 'nope' as BreakdownItemId, null)).toEqual([
      { kind: 'unknown-item', itemId: 'nope' },
    ]);
    expect(validateMove(TREE, 'wbs-3' as BreakdownItemId, 'nope' as BreakdownItemId)).toEqual([
      { kind: 'unknown-item', itemId: 'nope' },
    ]);
  });

  it('answers descendant questions used by drag targets', () => {
    expect(isDescendantOf(TREE, 'wbs-3' as BreakdownItemId, 'wbs-1' as BreakdownItemId)).toBe(true);
    expect(isDescendantOf(TREE, 'wbs-5' as BreakdownItemId, 'wbs-1' as BreakdownItemId)).toBe(false);
  });
});

describe('reparentAllocations (R4)', () => {
  const allocations = [
    allocation('wbs-3', 'emp-001', '2026-04', 0.5),
    allocation('wbs-3', 'emp-002', '2026-05', 0.25),
    allocation('wbs-4', 'emp-001', '2026-04', 0.1),
  ];

  it('moves a leaf"s own allocations onto the newly inserted child — never silent loss', () => {
    const moved = reparentAllocations(allocations, 'wbs-3' as BreakdownItemId, 'wbs-new' as BreakdownItemId);

    expect(moved).toHaveLength(2);
    expect(moved.every((entry) => entry.breakdownItemId === 'wbs-new')).toBe(true);
    expect(moved.map((entry) => entry.amount)).toEqual([0.5, 0.25]);
  });

  it('leaves other work packages alone', () => {
    const moved = reparentAllocations(allocations, 'wbs-3' as BreakdownItemId, 'wbs-new' as BreakdownItemId);

    expect(moved.map((entry) => entry.employeeId)).not.toContain('wbs-4');
    expect(allocations[2]?.breakdownItemId).toBe('wbs-4');
  });

  it('is a no-op for a leaf with nothing on it', () => {
    expect(reparentAllocations(allocations, 'wbs-5' as BreakdownItemId, 'wbs-new' as BreakdownItemId)).toEqual([]);
  });
});
