import { type CellPricing } from '@repo/delivery-domain';
import type { DisplayCurrency, PlatformHost } from '@repo/platform';
import type { EmployeeId, MonthKey } from '@repo/shared-common';
export interface PricingSource {
    /** `null` when People is unavailable, or has nothing to say about this person-month. */
    readonly lookup: (employeeId: EmployeeId, month: MonthKey) => CellPricing | null;
    readonly available: boolean;
    readonly employeeName: (employeeId: EmployeeId) => string;
}
/**
 * The whole of Delivery's dependency on People.
 *
 * Two calls per person-month — a quote and a person-month's hours — memoised, because a grid asks
 * several thousand times per render. The cache lives inside the memo, so it is thrown away whenever
 * any of its inputs change; there is no invalidation to get wrong.
 *
 * When People publishes `rates-changed` the whole source is rebuilt and every cost on screen
 * recomputes. That is F7 — "a rate edited in People reaches any open Delivery cost view with no
 * reload" — and it is this short because the event carries ids, not values: the consumer re-reads
 * through the contract rather than holding a copy that could go stale.
 *
 * The display currency is applied **here, to the rate**, not to finished totals. Converting a
 * column of rounded figures re-rounds every one of them and breaks R3's apportionment; converting
 * the rate means the grid is computed in the currency it is printed in, and the cells still add up.
 *
 * When the contract is absent, `lookup` returns `null` and the grid falls back to the two units
 * that need no price. Delivery never reads a rate record; it would not know what to do with one.
 */
export declare function usePricing(host: PlatformHost, currency: DisplayCurrency): PricingSource;
