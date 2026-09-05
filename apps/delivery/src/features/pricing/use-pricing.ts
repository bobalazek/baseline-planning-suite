import { toCellPricing, type CellPricing } from '@repo/delivery-domain';
import { PEOPLE_CONTRACT, PEOPLE_RATES_CHANGED } from '@repo/people-contracts';
import type { DisplayCurrency, PlatformHost } from '@repo/platform';
import type { EmployeeId, MonthKey } from '@repo/shared-common';
import { useEffect, useMemo, useState } from 'react';

import { useContract } from '../../hooks/use-platform';

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
export function usePricing(host: PlatformHost, currency: DisplayCurrency): PricingSource {
  const people = useContract(host, PEOPLE_CONTRACT);
  const [ratesRevision, setRatesRevision] = useState(0);

  useEffect(
    () =>
      host.bus.subscribe(PEOPLE_RATES_CHANGED, () => {
        setRatesRevision((current) => current + 1);
      }),
    [host]
  );

  return useMemo<PricingSource>(() => {
    const cache = new Map<string, CellPricing | null>();

    return {
      available: Boolean(people),

      employeeName: (employeeId) => people?.findEmployee(employeeId)?.name ?? String(employeeId),

      lookup(employeeId, month) {
        if (!people) {
          return null;
        }

        const key = `${employeeId}:${month}`;
        const cached = cache.get(key);

        if (cached !== undefined) {
          return cached;
        }

        const quote = people.findEmployee(employeeId) ? people.quoteMonth(employeeId, month) : null;

        const pricing = quote
          ? {
              ...toCellPricing(quote, people.personMonthHours(employeeId, month)),
              blendedRate: quote.blendedRate * currency.unitsPerEuro,
            }
          : null;

        cache.set(key, pricing);

        return pricing;
      },
    };
    // `ratesRevision` is a cache-busting dependency: nothing in the body reads it, but a rate edit
    // has to throw the memoised quotes away. This is the one place in the repo that needs it, and
    // the alternative — a mutable ref cache cleared from an effect — is harder to reason about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, currency, ratesRevision]);
}
