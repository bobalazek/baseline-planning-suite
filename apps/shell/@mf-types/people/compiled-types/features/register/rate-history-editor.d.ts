import type { DisplayCurrency } from '@repo/platform';
import { type Employee } from '@repo/shared-common';
import type { PeopleStore } from './people-store';
interface Props {
    readonly store: PeopleStore;
    readonly employee: Employee;
    readonly currency: DisplayCurrency;
}
/**
 * Rate history: addable, correctable and removable, including retroactively (F4).
 *
 * A rate runs from its `validFrom` until the next one begins, so the "until" column is derived from
 * the neighbour rather than stored — which is exactly why two records may not claim the same day,
 * and why the service refuses that with a message this form shows verbatim.
 */
export declare function RateHistoryEditor({ store, employee, currency }: Props): import("react").JSX.Element;
export {};
