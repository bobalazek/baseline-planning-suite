import {
  culpritFor,
  utilisationAt,
  type Grid,
  type UtilisationIndex,
} from '@repo/delivery-domain';
import type {
  BreakdownItem,
  BreakdownItemId,
  EmployeeId,
  MonthKey,
  Project,
} from '@repo/shared-common';

import { formatMonth, formatNumber } from '../../utils/format.utils';

interface Props {
  readonly grid: Grid;
  readonly utilisation: UtilisationIndex;
  readonly itemsById: ReadonlyMap<BreakdownItemId, BreakdownItem>;
  readonly projectsById: ReadonlyMap<string, Project>;
  readonly employeeName: (employeeId: EmployeeId) => string;
}

/**
 * R5's second half: "Delivery names the assignment that caused it, meaning the most recently edited
 * allocation contributing to that person-month."
 *
 * The overrun may come from a project the planner cannot see, so naming the assignment is the only
 * thing that makes the message actionable — which is why this lists the work package and project of
 * the culprit rather than just the fact of the overrun. The edit is never blocked.
 */
export function CapacityWarnings({
  grid,
  utilisation,
  itemsById,
  projectsById,
  employeeName,
}: Props) {
  const warnings = collectWarnings(grid, utilisation, itemsById, projectsById);

  if (warnings.length === 0) {
    return null;
  }

  return (
    <section className="delivery-warnings">
      <h3>Over capacity ({warnings.length})</h3>
      <p className="delivery-hint">
        Capacity is one person-month, summed across every project — including ones not open here.
        These edits were flagged, never blocked.
      </p>
      <ul>
        {warnings.map((warning) => (
          <li key={warning.key}>
            <strong>{employeeName(warning.employeeId)}</strong> · {formatMonth(warning.month)} ·{' '}
            {formatNumber(warning.personMonths, 2)} PM across {warning.projectCount} projects (over
            by {formatNumber(warning.overBy, 2)})
            {warning.culprit ? <span className="delivery-culprit">{warning.culprit}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface Warning {
  readonly key: string;
  readonly employeeId: EmployeeId;
  readonly month: MonthKey;
  readonly personMonths: number;
  readonly overBy: number;
  readonly projectCount: number;
  readonly culprit: string | null;
}

function collectWarnings(
  grid: Grid,
  utilisation: UtilisationIndex,
  itemsById: ReadonlyMap<BreakdownItemId, BreakdownItem>,
  projectsById: ReadonlyMap<string, Project>
): Warning[] {
  const seen = new Set<string>();
  const warnings: Warning[] = [];

  for (const row of grid.rows) {
    if (row.kind !== 'assignment') {
      continue;
    }

    for (const cell of row.cells) {
      const key = `${row.employeeId}:${cell.month}`;

      if (!cell.overCapacity || seen.has(key)) {
        continue;
      }

      seen.add(key);

      const entry = utilisationAt(utilisation, row.employeeId, cell.month);

      if (!entry) {
        continue;
      }

      warnings.push({
        key,
        employeeId: row.employeeId,
        month: cell.month,
        personMonths: entry.personMonths,
        overBy: entry.overCapacityBy,
        projectCount: entry.projectCount,
        culprit: describeCulprit(utilisation, row.employeeId, cell.month, itemsById, projectsById),
      });
    }
  }

  return warnings;
}

function describeCulprit(
  utilisation: UtilisationIndex,
  employeeId: EmployeeId,
  month: MonthKey,
  itemsById: ReadonlyMap<BreakdownItemId, BreakdownItem>,
  projectsById: ReadonlyMap<string, Project>
): string | null {
  const culprit = culpritFor(utilisation, employeeId, month);

  if (!culprit) {
    return null;
  }

  const item = itemsById.get(culprit.breakdownItemId);
  const project = item ? projectsById.get(item.projectId) : undefined;
  const where = [project?.name, item?.name].filter(Boolean).join(' › ');

  return `Most recently edited: ${where || culprit.breakdownItemId} — ${formatNumber(
    culprit.amount,
    2
  )} PM, by ${culprit.updatedBy}`;
}
