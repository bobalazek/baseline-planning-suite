import { type PeopleContract } from '@repo/people-contracts';
import type { PeopleStore } from '../register/people-store';
/**
 * The implementation of what People publishes to the rest of the suite.
 *
 * Quotes are memoised per `(employee, month)` and the whole cache is dropped whenever a rate
 * changes. A rate edit invalidates only that person's prices in principle, but the cache is a
 * few hundred entries and correctness beats cleverness here: a stale price is a wrong plan.
 */
export declare function createPeopleContract(store: PeopleStore): PeopleContract;
