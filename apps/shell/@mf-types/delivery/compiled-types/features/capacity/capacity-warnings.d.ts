import { type Grid, type UtilisationIndex } from '@repo/delivery-domain';
import type { BreakdownItem, BreakdownItemId, EmployeeId, Project } from '@repo/shared-common';
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
export declare function CapacityWarnings({ grid, utilisation, itemsById, projectsById, employeeName, }: Props): import("react").JSX.Element | null;
export {};
