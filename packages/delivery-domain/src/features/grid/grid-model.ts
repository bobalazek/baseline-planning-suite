import {
  distributeRounded,
  roundTo,
  sum,
  UNIT_DECIMALS,
  type Allocation,
  type AllocationId,
  type BreakdownItemId,
  type DisplayUnit,
  type EmployeeId,
  type MonthKey,
} from '@repo/shared-common';

import { buildAllocationIndex, type AllocationIndex } from '../allocations/allocation-index';
import { flatten, isLeaf, type BreakdownTree } from '../breakdown/breakdown-tree';
import { utilisationAt, type UtilisationIndex } from '../capacity/utilisation';
import { toDisplayValue, type CellPricing } from '../units/unit-conversion';

export interface GridCell {
  readonly month: MonthKey;
  /** The unrounded value in the current display unit. `null` when People is unreachable. */
  readonly exact: number | null;
  /** What the planner sees, after R3's largest-remainder pass. */
  readonly display: number | null;
  /** The stored value. Always known, even when the display unit is not computable. */
  readonly personMonths: number;
  readonly editable: boolean;
  readonly unpriced: boolean;
  readonly splitAcrossRates: boolean;
  readonly overCapacity: boolean;
  readonly allocationId: AllocationId | null;
}

interface GridRowBase {
  readonly id: string;
  readonly depth: number;
  readonly label: string;
  readonly itemId: BreakdownItemId;
  readonly cells: readonly GridCell[];
  readonly total: number | null;
  readonly totalExact: number | null;
}

/** A work package. Always read-only: "effort and cost on a parent come from its children" (R4). */
export interface BreakdownRow extends GridRowBase {
  readonly kind: 'breakdown';
}

/** One person on one leaf work package. This is the only row with editable cells. */
export interface AssignmentRow extends GridRowBase {
  readonly kind: 'assignment';
  readonly employeeId: EmployeeId;
  readonly employeeName: string;
}

export type GridRow = BreakdownRow | AssignmentRow;

export interface GridInput {
  readonly tree: BreakdownTree;
  readonly months: readonly MonthKey[];
  /** Allocations for the project on screen. Capacity still comes from `utilisation` (R5). */
  readonly allocations: readonly Allocation[];
  readonly unit: DisplayUnit;
  readonly utilisation: UtilisationIndex;
  readonly employeeName: (employeeId: EmployeeId) => string;
  /** `null` when People has not loaded, or has nothing to say about this person-month. */
  readonly pricing: (employeeId: EmployeeId, month: MonthKey) => CellPricing | null;
}

export interface Grid {
  readonly months: readonly MonthKey[];
  readonly unit: DisplayUnit;
  readonly rows: readonly GridRow[];
  /** Column totals, one per month, plus the grand total. Sums of displayed rows, so they add up. */
  readonly monthTotals: readonly (number | null)[];
  readonly grandTotal: number | null;
}

/**
 * Build the staffing grid.
 *
 * R3 holds in both directions because leaf cells are the only values rounded from exact numbers:
 * `distributeRounded` makes them sum to the row's rounded total, and every aggregate above is a sum
 * of values already on screen. So a parent cell equals the child cells printed beneath it and a row
 * total equals the cells printed beside it, exactly rather than within a cent.
 *
 * Rounding each aggregate independently instead would let a column visibly fail to add up.
 * Two-dimensional apportionment cannot have both; see decisions/0006-display-rounding.md.
 */
export function buildGrid(input: GridInput): Grid {
  const decimals = UNIT_DECIMALS[input.unit];
  const index = buildAllocationIndex(input.allocations);
  const rows: GridRow[] = [];

  // Depth-first, so a work package is always followed by what makes it up.
  for (const node of flatten(input.tree)) {
    const childRows: GridRow[] = [];

    if (isLeaf(node)) {
      for (const employeeId of assigneesOf(index, node.item.id, input.employeeName)) {
        childRows.push(
          buildAssignmentRow(node.item.id, node.depth + 1, employeeId, index, input, decimals)
        );
      }
    }

    rows.push({
      kind: 'breakdown',
      id: `item:${node.item.id}`,
      itemId: node.item.id,
      depth: node.depth,
      label: node.item.name,
      cells: [],
      total: null,
      totalExact: null,
    });

    rows.push(...childRows);
  }

  const withDerived = deriveBreakdownRows(rows, input);

  return {
    months: input.months,
    unit: input.unit,
    rows: withDerived,
    monthTotals: input.months.map((_, monthIndex) =>
      addOrNull(
        withDerived
          .filter((row) => row.kind === 'breakdown' && row.depth === 0)
          .map((row) => row.cells[monthIndex]?.display ?? null)
      )
    ),
    grandTotal: addOrNull(
      withDerived
        .filter((row) => row.kind === 'breakdown' && row.depth === 0)
        .map((row) => row.total)
    ),
  };
}

function buildAssignmentRow(
  itemId: BreakdownItemId,
  depth: number,
  employeeId: EmployeeId,
  index: AllocationIndex,
  input: GridInput,
  decimals: number
): AssignmentRow {
  const personMonthsByMonth = input.months.map(
    (month) => index.allocationAt(itemId, employeeId, month)?.amount ?? 0
  );

  const exactValues = input.months.map((month, monthIndex) =>
    toDisplayValue(
      personMonthsByMonth[monthIndex] as number,
      input.unit,
      input.pricing(employeeId, month)
    )
  );

  const computable = exactValues.every((value) => value !== null);
  const displayValues = computable
    ? distributeRounded(exactValues as number[], decimals)
    : exactValues.map(() => null);

  const cells: GridCell[] = input.months.map((month, monthIndex) => {
    const pricing = input.pricing(employeeId, month);
    const allocation = index.allocationAt(itemId, employeeId, month);

    return {
      month,
      exact: exactValues[monthIndex] ?? null,
      display: displayValues[monthIndex] ?? null,
      personMonths: personMonthsByMonth[monthIndex] as number,
      editable: true,
      unpriced: pricing?.unpriced ?? false,
      splitAcrossRates: pricing?.splitAcrossRates ?? false,
      overCapacity: (utilisationAt(input.utilisation, employeeId, month)?.overCapacityBy ?? 0) > 0,
      allocationId: allocation?.id ?? null,
    };
  });

  const totalExact = computable ? sum(exactValues as number[]) : null;

  return {
    kind: 'assignment',
    id: `assignment:${itemId}:${employeeId}`,
    itemId,
    depth,
    label: input.employeeName(employeeId),
    employeeId,
    employeeName: input.employeeName(employeeId),
    cells,
    total: totalExact === null ? null : roundTo(totalExact, decimals),
    totalExact,
  };
}

/**
 * Fill in every work-package row from what sits beneath it, deepest first, so that a level-1 row
 * sums level-2 rows that have themselves already been summed.
 */
function deriveBreakdownRows(rows: readonly GridRow[], input: GridInput): GridRow[] {
  const result = [...rows];

  for (let index = result.length - 1; index >= 0; index -= 1) {
    const row = result[index];

    if (!row || row.kind !== 'breakdown') {
      continue;
    }

    const children = directChildrenOf(result, index, row.depth);

    const cells: GridCell[] = input.months.map((month, monthIndex) => ({
      month,
      exact: addOrNull(children.map((child) => child.cells[monthIndex]?.exact ?? null)),
      display: addOrNull(children.map((child) => child.cells[monthIndex]?.display ?? null)),
      personMonths: sum(children.map((child) => child.cells[monthIndex]?.personMonths ?? 0)),
      editable: false,
      unpriced: children.some((child) => child.cells[monthIndex]?.unpriced ?? false),
      splitAcrossRates: false,
      overCapacity: children.some((child) => child.cells[monthIndex]?.overCapacity ?? false),
      allocationId: null,
    }));

    result[index] = {
      ...row,
      cells,
      total: addOrNull(children.map((child) => child.total)),
      totalExact: addOrNull(children.map((child) => child.totalExact)),
    };
  }

  return result;
}

/** Rows that sit immediately beneath `parentIndex`: the next depth down, before the depth rises. */
function directChildrenOf(
  rows: readonly GridRow[],
  parentIndex: number,
  parentDepth: number
): GridRow[] {
  const children: GridRow[] = [];

  for (let index = parentIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];

    if (!row || row.depth <= parentDepth) {
      break;
    }

    if (row.depth === parentDepth + 1) {
      children.push(row);
    }
  }

  return children;
}

function assigneesOf(
  index: AllocationIndex,
  itemId: BreakdownItemId,
  employeeName: (employeeId: EmployeeId) => string
): EmployeeId[] {
  return [...index.employeesOn(itemId)].sort((a, b) =>
    employeeName(a).localeCompare(employeeName(b))
  );
}

/** A sum where one unknown makes the whole unknown, a partial total would be a lie. */
function addOrNull(values: readonly (number | null)[]): number | null {
  return values.some((value) => value === null) ? null : sum(values as number[]);
}
