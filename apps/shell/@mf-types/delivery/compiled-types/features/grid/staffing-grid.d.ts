import type { Grid, GridRow } from '@repo/delivery-domain';
import type { DisplayCurrency } from '@repo/platform';
import { type BreakdownItem, type BreakdownItemId, type Employee, type EmployeeId, type MonthKey } from '@repo/shared-common';
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
export declare function StaffingGrid({ grid, currency, actions, itemsById, moveTargetsFor, assignableFor, isLeaf, overCapacityNote, }: Props): import("react").JSX.Element;
export {};
