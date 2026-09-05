import type { Employee, BreakdownItemId, EmployeeId } from '@repo/shared-common';
interface Props {
    readonly itemId: BreakdownItemId;
    readonly candidates: readonly Employee[];
    readonly busy: boolean;
    readonly onAdd: (itemId: BreakdownItemId, employeeId: EmployeeId) => void;
}
/**
 * Put somebody on a leaf work package.
 *
 * The list of people comes from People's published contract, so this control disappears when People
 * is unavailable — Delivery has no register of its own and will not invent one.
 */
export declare function AddAssignment({ itemId, candidates, busy, onAdd }: Props): import("react").JSX.Element | null;
export {};
