import { toCellPricing, type CellPricing } from '@repo/delivery-domain';
import { buildRateTimeline, personMonthHours, quoteMonth } from '@repo/people-domain';
import type { MonthQuote } from '@repo/people-contracts';
import type { Employee, EmployeeId, MonthKey, RateRecord } from '@repo/shared-common';

import { loadSeed, type Seed } from './load-seed';

/**
 * Compose the two domains the way the running suite composes them: People answers `quoteMonth` and
 * `personMonthHours`, Delivery consumes the answers through `CellPricing`. Nothing is stubbed —
 * this is the real pricing path, minus the HTTP and the React.
 */
export interface Suite {
  readonly seed: Seed;
  readonly employeeById: ReadonlyMap<EmployeeId, Employee>;
  quoteMonth(employeeId: EmployeeId, month: MonthKey): MonthQuote;
  personMonthHours(employeeId: EmployeeId, month: MonthKey): number;
  pricing(employeeId: EmployeeId, month: MonthKey): CellPricing | null;
}

export function composeSuite(seed: Seed = loadSeed()): Suite {
  const employeeById = new Map(seed.employees.map((employee) => [employee.id, employee]));
  const ratesByEmployee = new Map<EmployeeId, RateRecord[]>();

  for (const record of seed.rateRecords) {
    const records = ratesByEmployee.get(record.employeeId) ?? [];

    records.push(record);
    ratesByEmployee.set(record.employeeId, records);
  }

  const timelines = new Map(
    [...employeeById.keys()].map((employeeId) => [
      employeeId,
      buildRateTimeline(ratesByEmployee.get(employeeId) ?? []),
    ])
  );

  const quote = (employeeId: EmployeeId, month: MonthKey): MonthQuote => {
    const timeline = timelines.get(employeeId);

    if (!timeline) {
      throw new Error(`Unknown employee ${employeeId}`);
    }

    return quoteMonth(employeeId, month, timeline);
  };

  const hoursPerPersonMonth = (employeeId: EmployeeId, month: MonthKey): number => {
    const employee = employeeById.get(employeeId);

    if (!employee) {
      throw new Error(`Unknown employee ${employeeId}`);
    }

    return personMonthHours(employee.weeklyHours, month);
  };

  return {
    seed,
    employeeById,
    quoteMonth: quote,
    personMonthHours: hoursPerPersonMonth,
    pricing: (employeeId, month) =>
      employeeById.has(employeeId)
        ? toCellPricing(quote(employeeId, month), hoursPerPersonMonth(employeeId, month))
        : null,
  };
}
