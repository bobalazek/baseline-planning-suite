import type { PeopleContract } from '@repo/people-contracts';
import type { DisplayCurrency, PlatformHost } from '@repo/platform';
import { type Employee } from '@repo/shared-common';
import type { PeopleStore } from './people-store';
interface Props {
    readonly host: PlatformHost;
    readonly store: PeopleStore;
    readonly contract: PeopleContract;
    readonly employee: Employee;
    readonly currency: DisplayCurrency;
    readonly deliveryRevision: number;
}
/** One person: who they are, what they cost over time, and how loaded they already are. */
export declare function EmployeeDetail({ host, store, contract, employee, currency, deliveryRevision, }: Props): import("react").JSX.Element;
export {};
