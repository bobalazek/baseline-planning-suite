import {
  PEOPLE_CONTRACT_VERSION,
  type MonthQuote,
  type PeopleContract,
} from '@repo/people-contracts';
import { personMonthHours, quoteMonth } from '@repo/people-domain';
import type { EmployeeId, MonthKey } from '@repo/shared-common';

import type { PeopleStore } from '../register/people-store';

/**
 * The implementation of what People publishes to the rest of the suite.
 *
 * Quotes are memoised per `(employee, month)` and the whole cache is dropped whenever a rate
 * changes. A rate edit invalidates only that person's prices in principle, but the cache is a
 * few hundred entries and correctness beats cleverness here: a stale price is a wrong plan.
 */
export function createPeopleContract(store: PeopleStore): PeopleContract {
  let quotes = new Map<string, MonthQuote>();
  let cachedRevision = store.snapshot().revision;

  const invalidateIfStale = (): void => {
    const { revision } = store.snapshot();

    if (revision !== cachedRevision) {
      quotes = new Map();
      cachedRevision = revision;
    }
  };

  return {
    version: PEOPLE_CONTRACT_VERSION,

    listEmployees: () => store.employees(),
    findEmployee: (employeeId) => store.findEmployee(employeeId),

    personMonthHours(employeeId: EmployeeId, month: MonthKey) {
      const employee = store.findEmployee(employeeId);

      return employee ? personMonthHours(employee.weeklyHours, month) : 0;
    },

    quoteMonth(employeeId: EmployeeId, month: MonthKey) {
      invalidateIfStale();

      const key = `${employeeId}:${month}`;
      const cached = quotes.get(key);

      if (cached) {
        return cached;
      }

      const quote = quoteMonth(employeeId, month, store.timelineOf(employeeId));

      quotes.set(key, quote);

      return quote;
    },
  };
}
