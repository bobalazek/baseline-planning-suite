import type { Grid, GridRow } from '@repo/delivery-domain';
import type { DisplayCurrency } from '@repo/platform';
import {
  UNIT_DECIMALS,
  UNIT_LABELS,
  type BreakdownItem,
  type BreakdownItemId,
  type Employee,
  type EmployeeId,
  type MonthKey,
} from '@repo/shared-common';

import { formatMonth } from '../../utils/format.utils';
import { AddAssignment } from '../breakdown/add-assignment';
import { BreakdownActions } from '../breakdown/breakdown-actions';
import { GridCell } from './grid-cell';

export interface GridActions {
  readonly busy: boolean;
  readonly onEditCell: (row: GridRow, month: MonthKey, entered: number) => void;
  readonly onAddChild: (parentId: BreakdownItemId) => void;
  readonly onRename: (itemId: BreakdownItemId) => void;
  readonly onMove: (itemId: BreakdownItemId, parentId: BreakdownItemId | null) => void;
  readonly onDelete: (itemId: BreakdownItemId) => void;
  readonly onAssign: (itemId: BreakdownItemId, employeeId: EmployeeId) => void;
}

interface Props {
  readonly grid: Grid;
  readonly currency: DisplayCurrency;
  readonly actions: GridActions;
  readonly itemsById: ReadonlyMap<BreakdownItemId, BreakdownItem>;
  readonly moveTargetsFor: (itemId: BreakdownItemId) => readonly BreakdownItem[];
  readonly assignableFor: (itemId: BreakdownItemId) => readonly Employee[];
  readonly isLeaf: (itemId: BreakdownItemId) => boolean;
  readonly overCapacityNote: (row: GridRow, month: MonthKey) => string | null;
}

/**
 * People × months, every leaf cell editable (F6).
 *
 * The grid model — rows, roll-ups and the rounding that makes totals add up — is built by
 * `@repo/delivery-domain` and tested without a DOM. This component only paints it.
 *
 * Costs arrive already expressed in the display currency (the conversion happens at the rate), so
 * nothing here re-rounds a total and the columns reconcile in whatever currency is selected.
 */
export function StaffingGrid({
  grid,
  currency,
  actions,
  itemsById,
  moveTargetsFor,
  assignableFor,
  isLeaf,
  overCapacityNote,
}: Props) {
  const decimals = UNIT_DECIMALS[grid.unit];
  const prefix = grid.unit === 'cost' ? currency.symbol : '';

  return (
    <div className="grid-scroll">
      <table className="grid">
        <thead>
          <tr>
            <th className="grid-label-col">
              Work package / person
              <span className="grid-unit">
                {prefix}
                {UNIT_LABELS[grid.unit]}
              </span>
            </th>
            {grid.months.map((month) => (
              <th key={month} className="grid-month">
                {formatMonth(month)}
              </th>
            ))}
            <th className="grid-month grid-total-col">Total</th>
          </tr>
        </thead>

        <tbody>
          {grid.rows.map((row) => {
            const item = itemsById.get(row.itemId);

            return (
              <tr
                key={row.id}
                className={row.kind === 'breakdown' ? 'grid-row--package' : 'grid-row--person'}
              >
                <th
                  scope="row"
                  className="grid-label-col"
                  style={{ paddingLeft: 8 + row.depth * 16 }}
                >
                  <span className="grid-label">
                    {row.label}
                    {row.kind === 'breakdown' ? (
                      <span className="grid-derived-tag">derived</span>
                    ) : null}
                  </span>

                  {row.kind === 'breakdown' && item ? (
                    <BreakdownActions
                      item={item}
                      moveTargets={moveTargetsFor(item.id)}
                      busy={actions.busy}
                      onAddChild={actions.onAddChild}
                      onRename={actions.onRename}
                      onMove={actions.onMove}
                      onDelete={actions.onDelete}
                    />
                  ) : null}

                  {row.kind === 'breakdown' && item && isLeaf(item.id) ? (
                    <AddAssignment
                      itemId={item.id}
                      candidates={assignableFor(item.id)}
                      busy={actions.busy}
                      onAdd={actions.onAssign}
                    />
                  ) : null}
                </th>

                {row.cells.map((cell) => (
                  <GridCell
                    key={cell.month}
                    cell={cell}
                    decimals={decimals}
                    value={cell.display}
                    overCapacityNote={overCapacityNote(row, cell.month)}
                    onCommit={(entered) => actions.onEditCell(row, cell.month, entered)}
                  />
                ))}

                <td className="grid-cell grid-cell--total">
                  {row.total === null
                    ? '—'
                    : row.total.toLocaleString('en-GB', {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals,
                      })}
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr>
            <th scope="row" className="grid-label-col">
              All work packages
            </th>
            {grid.monthTotals.map((total, index) => (
              <td key={grid.months[index] ?? index} className="grid-cell grid-cell--total">
                {total === null
                  ? '—'
                  : total.toLocaleString('en-GB', {
                      minimumFractionDigits: decimals,
                      maximumFractionDigits: decimals,
                    })}
              </td>
            ))}
            <td className="grid-cell grid-cell--total grid-cell--grand">
              {grid.grandTotal === null
                ? '—'
                : grid.grandTotal.toLocaleString('en-GB', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                  })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
