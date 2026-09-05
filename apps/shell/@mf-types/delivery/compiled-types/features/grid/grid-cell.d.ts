import type { GridCell as GridCellModel } from '@repo/delivery-domain';
interface Props {
    readonly cell: GridCellModel;
    readonly decimals: number;
    /** Already converted into the unit and currency on screen. `null` when it cannot be computed. */
    readonly value: number | null;
    readonly overCapacityNote: string | null;
    readonly onCommit: (entered: number) => void;
}
/**
 * One cell of the staffing grid.
 *
 * Only leaf cells are editable — a parent's effort comes from its children (R4). An edit is
 * committed on blur or Enter and abandoned on Escape, and the input starts from the *displayed*
 * value, so what the planner sees is what they are correcting.
 *
 * A cell can be flagged for two independent reasons, and the difference matters: `†` means the
 * person is over capacity once every project is counted (R5, never blocked, only flagged), and `·`
 * means part of the month precedes their first rate and costs nothing (R1).
 */
export declare function GridCell({ cell, decimals, value, overCapacityNote, onCommit }: Props): import("react").JSX.Element;
export {};
