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
 * The whole of Delivery's dependency on People: a quote and a person-month's hours per cell,
 * memoised because the grid asks thousands of times per render. The cache lives inside the memo, so
 * it is discarded whenever an input changes and there is no invalidation to get wrong.
 *
 * A `rates-changed` event rebuilds the source and every cost on screen recomputes (F7). The display
 * currency is applied to the rate rather than to finished totals: converting a column of rounded
 * figures would re-round every one and break R3's apportionment.
 *
 * With no contract, `lookup` returns null and the grid falls back to the units that need no price.
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
    // the alternative, a mutable ref cache cleared from an effect, is harder to reason about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, currency, ratesRevision]);
}
