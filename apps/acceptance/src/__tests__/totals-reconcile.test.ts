import {
  buildBreakdownTree,
  buildGrid,
  buildUtilisationIndex,
  type Grid,
  type GridRow,
} from '@repo/delivery-domain';
import { DISPLAY_UNITS, roundTo, sum, UNIT_DECIMALS, type DisplayUnit } from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import { composeSuite } from '../fixtures/compose-suite';
import { projectHorizon } from '../fixtures/project-horizon';

/**
 * R3 over the whole shipped fixture: 4 projects × 4 units, every row, every month.
 *
 * These assertions are about what a reader can verify on screen — a total equals the cells beside
 * it, a parent equals the cells beneath it — which is the trade-off ADR-0006 makes explicit.
 */
describe('Totals add up across the whole fixture (R3)', () => {
  const suite = composeSuite();
  const utilisation = buildUtilisationIndex(suite.seed.allocations, suite.seed.breakdownItems);

  const gridsFor = (unit: DisplayUnit): { name: string; grid: Grid }[] =>
    suite.seed.projects.map((project) => ({
      name: project.name,
      grid: buildGrid({
        tree: buildBreakdownTree(suite.seed.breakdownItems, project.id),
        months: projectHorizon(project),
        allocations: suite.seed.allocations,
        unit,
        utilisation,
        employeeName: (employeeId) => suite.employeeById.get(employeeId)?.name ?? employeeId,
        pricing: suite.pricing,
      }),
    }));

  const childrenOf = (rows: readonly GridRow[], parentIndex: number): GridRow[] => {
    const parent = rows[parentIndex] as GridRow;
    const children: GridRow[] = [];

    for (let index = parentIndex + 1; index < rows.length; index += 1) {
      const candidate = rows[index] as GridRow;

      if (candidate.depth <= parent.depth) {
        break;
      }

      if (candidate.depth === parent.depth + 1) {
        children.push(candidate);
      }
    }

    return children;
  };

  it.each(DISPLAY_UNITS)('every row total equals the sum of its cells — %s', (unit) => {
    for (const { name, grid } of gridsFor(unit)) {
      for (const row of grid.rows) {
        const cells = row.cells.map((cell) => cell.display as number);

        expect(
          roundTo(sum(cells), 6),
          `${name} / ${row.label} (${unit})`
        ).toBe(roundTo(row.total as number, 6));
      }
    }
  });

  it.each(DISPLAY_UNITS)('every derived cell equals the sum of its children — %s', (unit) => {
    for (const { name, grid } of gridsFor(unit)) {
      grid.rows.forEach((row, rowIndex) => {
        if (row.kind !== 'breakdown') {
          return;
        }

        const children = childrenOf(grid.rows, rowIndex);

        row.cells.forEach((cell, monthIndex) => {
          const fromChildren = sum(children.map((child) => child.cells[monthIndex]?.display ?? 0));

          expect(
            roundTo(cell.display as number, 6),
            `${name} / ${row.label} / ${cell.month} (${unit})`
          ).toBe(roundTo(fromChildren, 6));
        });
      });
    }
  });

  it.each(DISPLAY_UNITS)('the grand total reconciles both ways — %s', (unit) => {
    for (const { name, grid } of gridsFor(unit)) {
      const roots = grid.rows.filter((row) => row.kind === 'breakdown' && row.depth === 0);

      expect(roundTo(grid.grandTotal as number, 6), name).toBe(
        roundTo(sum(grid.monthTotals as number[]), 6)
      );
      expect(roundTo(grid.grandTotal as number, 6), name).toBe(
        roundTo(sum(roots.map((row) => row.total as number)), 6)
      );
    }
  });

  it.each(DISPLAY_UNITS)(
    'no displayed aggregate drifts from its exact value by more than one unit in the last place — %s',
    (unit) => {
      const tolerance = 10 ** -UNIT_DECIMALS[unit];
      let worst = 0;

      for (const { grid } of gridsFor(unit)) {
        for (const row of grid.rows) {
          worst = Math.max(worst, Math.abs((row.total as number) - (row.totalExact as number)));

          for (const cell of row.cells) {
            worst = Math.max(worst, Math.abs((cell.display as number) - (cell.exact as number)));
          }
        }
      }

      expect(worst).toBeLessThanOrEqual(tolerance + 1e-9);
    }
  );

  it('prices every cell in the fixture — nothing silently falls through as unknown', () => {
    for (const { grid } of gridsFor('cost')) {
      for (const row of grid.rows) {
        expect(row.total).not.toBeNull();
        expect(row.cells.every((cell) => cell.display !== null)).toBe(true);
      }
    }
  });
});
