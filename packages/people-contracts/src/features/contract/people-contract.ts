import { defineContract, defineEvent } from '@repo/platform';
import type { Employee, EmployeeId, MonthKey } from '@repo/shared-common';

import type { MonthQuote } from './month-quote';

/**
 * What the People team publishes to the rest of the suite.
 *
 * Note what is absent: `RateRecord`, `hourlyCost`, `validFrom`. Rate records are People's, and they
 * do not cross this line. What crosses is a **price** — one blended euro-per-hour figure per person
 * per month — plus the person's contracted capacity for that month.
 *
 * Every method is synchronous. It is served from a projection People has already hydrated, because
 * the consumer is a grid painting several hundred cells and cannot afford a promise per cell.
 */
export interface PeopleContract {
  readonly version: string;

  listEmployees(): readonly Employee[];
  findEmployee(employeeId: EmployeeId): Employee | undefined;

  /**
   * `weeklyHours × workingDays(month) ÷ 5`. Varies by person *and* by month — it is never a
   * constant, which is exactly why Delivery has to ask instead of assuming 160.
   */
  personMonthHours(employeeId: EmployeeId, month: MonthKey): number;

  /** The month's price. See {@link MonthQuote}. */
  quoteMonth(employeeId: EmployeeId, month: MonthKey): MonthQuote;
}

export const PEOPLE_CONTRACT_VERSION = '1.0';

export const PEOPLE_CONTRACT = defineContract<PeopleContract>(
  'people/directory',
  PEOPLE_CONTRACT_VERSION
);

/**
 * Published whenever a rate edit changes what a month costs. Carries ids, never values: the
 * consumer re-reads through the contract, so the two apps can never hold divergent copies of
 * People's state (F7).
 */
export const PEOPLE_RATES_CHANGED = defineEvent<{ readonly employeeIds: readonly EmployeeId[] }>(
  'people/rates-changed'
);

/** Published when the register itself changes — a name, a role, contracted hours. */
export const PEOPLE_EMPLOYEES_CHANGED = defineEvent<{
  readonly employeeIds: readonly EmployeeId[];
}>('people/employees-changed');
