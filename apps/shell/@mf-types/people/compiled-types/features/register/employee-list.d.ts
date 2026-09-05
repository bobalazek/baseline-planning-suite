import type { PlatformHost } from '@repo/platform';
import type { Employee, EmployeeId } from '@repo/shared-common';
interface Props {
    readonly host: PlatformHost;
    readonly employees: readonly Employee[];
    readonly selectedId: EmployeeId | null;
    readonly query: string;
    readonly onQueryChange: (query: string) => void;
    readonly onSelect: (employeeId: EmployeeId) => void;
    readonly deliveryRevision: number;
}
/** The searchable register (F3), with the over-capacity flag R5 asks People to show (F8). */
export declare function EmployeeList({ host, employees, selectedId, query, onQueryChange, onSelect, deliveryRevision, }: Props): import("react").JSX.Element;
export {};
