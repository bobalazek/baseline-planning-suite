import type { PlatformHost } from '@repo/platform';
import { type EmployeeId } from '@repo/shared-common';
interface Props {
    readonly host: PlatformHost;
    readonly employeeId: EmployeeId;
    /** Bumped when Delivery says allocations moved, so this re-reads through the contract. */
    readonly revision: number;
}
/**
 * R5 from People's side: is this person committed beyond their contracted hours?
 *
 * The numbers come from Delivery's published contract and are summed across **every** project,
 * including ones this planner cannot see. People does not hold allocations and never will; if
 * Delivery is not loaded, this panel says so rather than implying the person is free.
 */
export declare function UtilisationPanel({ host, employeeId, revision }: Props): import("react").JSX.Element;
export {};
