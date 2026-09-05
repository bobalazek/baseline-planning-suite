import {
  RECONCILIATION_TOLERANCE,
  roundTo,
  sum,
  toMonthKey,
  type DisplayUnit,
  type EmployeeId,
  type MonthKey,
} from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import {
  buildBreakdownTree,
  buildGrid,
  buildUtilisationIndex,
  type CellPricing,
  type Grid,
  type GridInput,
  type GridRow,
} from '../index';
import { allocation, employeeName, item, MONTHS, PROJECT } from './test-fixtures';

const ITEMS = [
  item('wbs-1', null, 'Ledger migration'),
  item('wbs-2', 'wbs-1', 'Discovery'),
  item('wbs-3', 'wbs-1', 'Migration'),
  item('wbs-4', null, 'Reporting cut-over'),
];

const ALLOCATIONS = [
  allocation('wbs-2', 'emp-001', '2026-04', 0.805),
  allocation('wbs-2', 'emp-002', '2026-04', 0.705),
  allocation('wbs-2', 'emp-001', '2026-05', 1.0),
  allocation('wbs-3', 'emp-003', '2026-04', 0.605),
  allocation('wbs-3', 'emp-003', '2026-06', 0.125),
  allocation('wbs-4', 'emp-001', '2026-06', 0.335),
];

/** Deliberately different per person and per month, as the real contract is. */
const PRICING: Record<string, CellPricing> = {
  'emp-001': { personMonthHours: 176, blendedRate: 89.5455, unpriced: false, splitAcrossRates: true },
  'emp-002': { personMonthHours: 140.8, blendedRate: 70, unpriced: false, splitAcrossRates: false },
  'emp-003': { personMonthHours: 88, blendedRate: 55.5, unpriced: true, splitAcrossRates: false },
};

function gridFor(unit: DisplayUnit, pricingAvailable = true): Grid {
  const input: GridInput = {
    tree: buildBreakdownTree(ITEMS, PROJECT),
    months: MONTHS,
    allocations: ALLOCATIONS,
    unit,
    utilisation: buildUtilisationIndex(ALLOCATIONS, ITEMS),
    employeeName,
    pricing: (employeeId) => (pricingAvailable ? (PRICING[employeeId] ?? null) : null),
  };

  return buildGrid(input);
}

function row(grid: Grid, id: string): GridRow {
  const found = grid.rows.find((candidate) => candidate.id === id);

  if (!found) {
    throw new Error(`No row ${id} in ${grid.rows.map((r) => r.id).join(', ')}`);
  }

  return found;
}

function childrenOf(grid: Grid, parentId: string): GridRow[] {
  const parentIndex = grid.rows.findIndex((candidate) => candidate.id === parentId);
  const parent = grid.rows[parentIndex] as GridRow;
  const children: GridRow[] = [];

  for (let index = parentIndex + 1; index < grid.rows.length; index += 1) {
    const candidate = grid.rows[index] as GridRow;

    if (candidate.depth <= parent.depth) {
      break;
    }

    if (candidate.depth === parent.depth + 1) {
      children.push(candidate);
    }
  }

  return children;
}

describe('buildGrid — shape', () => {
  it('lists work packages depth-first with the people under their leaf', () => {
    expect(gridFor('personMonths').rows.map((entry) => `${entry.depth}:${entry.label}`)).toEqual([
      '0:Ledger migration',
      '1:Discovery',
      '2:Adaeze Okafor',
      '2:Bo Andersen',
      '1:Migration',
      '2:Chen Wei',
      '0:Reporting cut-over',
      '1:Adaeze Okafor',
    ]);
  });

  it('makes only assignment cells editable — parents are derived (R4)', () => {
    for (const entry of gridFor('personMonths').rows) {
      expect(entry.cells.every((cell) => cell.editable)).toBe(entry.kind === 'assignment');
    }
  });

  it('carries the stored person-months on every cell, whatever unit is displayed', () => {
    const okafor = row(gridFor('cost'), 'assignment:wbs-2:emp-001');

    expect(okafor.cells.map((cell) => cell.personMonths)).toEqual([0.805, 1, 0]);
  });
});

describe('buildGrid — totals add up (R3)', () => {
  const units: DisplayUnit[] = ['personMonths', 'hours', 'percent', 'cost'];

  it('makes every row total equal the sum of the cells printed beside it', () => {
    for (const unit of units) {
      const grid = gridFor(unit);

      for (const entry of grid.rows) {
        const cells = entry.cells.map((cell) => cell.display as number);

        expect(roundTo(sum(cells), 6)).toBe(roundTo(entry.total as number, 6));
      }
    }
  });

  it('makes every derived cell equal the sum of the cells printed beneath it', () => {
    for (const unit of units) {
      const grid = gridFor(unit);

      for (const parent of grid.rows.filter((entry) => entry.kind === 'breakdown')) {
        const children = childrenOf(grid, parent.id);

        parent.cells.forEach((cell, monthIndex) => {
          const fromChildren = sum(children.map((child) => child.cells[monthIndex]?.display ?? 0));

          expect(roundTo(cell.display as number, 6)).toBe(roundTo(fromChildren, 6));
        });
      }
    }
  });

  it('makes the column totals equal the sum of the root rows', () => {
    for (const unit of units) {
      const grid = gridFor(unit);
      const roots = grid.rows.filter((entry) => entry.kind === 'breakdown' && entry.depth === 0);

      grid.monthTotals.forEach((total, monthIndex) => {
        const fromRoots = sum(roots.map((entry) => entry.cells[monthIndex]?.display ?? 0));

        expect(roundTo(total as number, 6)).toBe(roundTo(fromRoots, 6));
      });

      expect(roundTo(grid.grandTotal as number, 6)).toBe(roundTo(sum(grid.monthTotals as number[]), 6));
    }
  });

  it('applies largest remainder along the row so a leaf row total is exact', () => {
    // 0.805 + 1.0 exact is 1.805. Independent rounding of the cells gives 0.81 + 1.00 = 1.81,
    // which happens to agree; the pass guarantees it rather than leaving it to luck.
    const okafor = row(gridFor('personMonths'), 'assignment:wbs-2:emp-001');

    expect(okafor.cells.map((cell) => cell.display)).toEqual([0.81, 1, 0]);
    expect(okafor.total).toBeCloseTo(1.81, 10);
    expect(okafor.totalExact).toBeCloseTo(1.805, 10);
  });

  it('prints a derived cell as the sum of the cells beneath it, even when that differs from the rounded exact value', () => {
    // 0.805 + 0.705 is exactly 1.51, but the two cells print as 0.81 and 0.71. The parent prints
    // 1.52 — what the reader can add up on screen — rather than 1.51, which would make the column
    // visibly fail to add. This is the trade-off documented in
    // docs/project/decisions/0006-display-rounding.md: two-dimensional apportionment cannot make
    // every aggregate equal its own rounded exact value *and* reconcile in both directions.
    const discovery = row(gridFor('personMonths'), 'item:wbs-2');

    expect(discovery.cells[0]?.exact).toBeCloseTo(1.51, 10);
    expect(discovery.cells[0]?.display).toBeCloseTo(1.52, 10);
    expect(discovery.cells[0]?.display).toBeCloseTo(
      (row(gridFor('personMonths'), 'assignment:wbs-2:emp-001').cells[0]?.display as number) +
        (row(gridFor('personMonths'), 'assignment:wbs-2:emp-002').cells[0]?.display as number),
      10
    );
  });

  it('never drifts from the exact value by more than the floating-point tolerance', () => {
    for (const unit of units) {
      for (const entry of gridFor(unit).rows) {
        expect(Math.abs((entry.total as number) - (entry.totalExact as number))).toBeLessThanOrEqual(
          RECONCILIATION_TOLERANCE
        );
      }
    }
  });
});

describe('buildGrid — flags', () => {
  it('marks cells whose month is partly unpriced (R1)', () => {
    const chen = row(gridFor('cost'), 'assignment:wbs-3:emp-003');

    expect(chen.cells.every((cell) => cell.unpriced)).toBe(true);
  });

  it('marks cells where the month contains a rate change', () => {
    const okafor = row(gridFor('cost'), 'assignment:wbs-2:emp-001');

    expect(okafor.cells.every((cell) => cell.splitAcrossRates)).toBe(true);
  });

  it('flags over capacity on the person"s cell and propagates it to the parent (R5)', () => {
    const grid = gridFor('personMonths');
    // emp-001 carries 1.0 in May on wbs-2 — exactly capacity, not over.
    expect(row(grid, 'assignment:wbs-2:emp-001').cells[1]?.overCapacity).toBe(false);
  });

  it('flags a person over capacity across projects', () => {
    const overloaded = [...ALLOCATIONS, allocation('wbs-4', 'emp-001', '2026-05', 0.4)];
    const grid = buildGrid({
      tree: buildBreakdownTree(ITEMS, PROJECT),
      months: MONTHS,
      allocations: overloaded,
      unit: 'personMonths',
      utilisation: buildUtilisationIndex(overloaded, ITEMS),
      employeeName,
      pricing: (employeeId) => PRICING[employeeId] ?? null,
    });

    expect(row(grid, 'assignment:wbs-2:emp-001').cells[1]?.overCapacity).toBe(true);
    expect(row(grid, 'item:wbs-1').cells[1]?.overCapacity).toBe(true);
  });
});

describe('buildGrid — degraded without People (F9)', () => {
  it('still shows person-months and % of capacity', () => {
    for (const unit of ['personMonths', 'percent'] as DisplayUnit[]) {
      const grid = gridFor(unit, false);

      expect(grid.grandTotal).not.toBeNull();
      expect(row(grid, 'assignment:wbs-2:emp-001').cells[0]?.display).not.toBeNull();
    }
  });

  it('shows nothing rather than a wrong number for hours and cost', () => {
    for (const unit of ['hours', 'cost'] as DisplayUnit[]) {
      const grid = gridFor(unit, false);

      expect(row(grid, 'assignment:wbs-2:emp-001').cells[0]?.display).toBeNull();
      expect(grid.grandTotal).toBeNull();
    }
  });

  it('keeps the stored person-months readable so an edit is still possible', () => {
    const okafor = row(gridFor('cost', false), 'assignment:wbs-2:emp-001');

    expect(okafor.cells[0]?.personMonths).toBe(0.805);
  });
});

describe('buildGrid — empty cases', () => {
  it('shows a work package with nothing on it as zero, not blank', () => {
    const grid = buildGrid({
      tree: buildBreakdownTree([item('wbs-1', null, 'Empty')], PROJECT),
      months: MONTHS,
      allocations: [],
      unit: 'personMonths',
      utilisation: buildUtilisationIndex([], []),
      employeeName,
      pricing: () => null,
    });

    expect(grid.rows).toHaveLength(1);
    expect(grid.rows[0]?.total).toBe(0);
    expect(grid.grandTotal).toBe(0);
  });

  it('handles an empty horizon', () => {
    const months: MonthKey[] = [];
    const grid = buildGrid({
      tree: buildBreakdownTree(ITEMS, PROJECT),
      months,
      allocations: ALLOCATIONS,
      unit: 'personMonths',
      utilisation: buildUtilisationIndex(ALLOCATIONS, ITEMS),
      employeeName,
      pricing: (employeeId: EmployeeId) => PRICING[employeeId] ?? null,
    });

    expect(grid.monthTotals).toEqual([]);
    expect(grid.rows.every((entry) => entry.cells.length === 0)).toBe(true);
  });
});

describe('grid months', () => {
  it('echoes the horizon it was given', () => {
    expect(gridFor('personMonths').months).toEqual([
      toMonthKey('2026-04'),
      toMonthKey('2026-05'),
      toMonthKey('2026-06'),
    ]);
  });
});
