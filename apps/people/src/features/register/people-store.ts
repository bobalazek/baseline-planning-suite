import type { CreateRateRecordInput, UpdateRateRecordInput } from '@repo/people-contracts';
import { buildRateTimeline, type RateTimeline } from '@repo/people-domain';
import type { Unsubscribe } from '@repo/platform';
import type { Employee, EmployeeId, RateRecord, RateRecordId } from '@repo/shared-common';

import type { PeopleClient } from './people-client';

/**
 * People's hydrated projection of its own service.
 *
 * Everything the published contract answers is served from here, synchronously. The alternative —
 * a promise per lookup — is unusable on the consuming side, where a grid asks for a price several
 * hundred times in one render.
 *
 * A mutation writes through the service first and re-reads afterwards. Nothing is applied
 * optimistically: a rate is the input to every cost in the suite, and briefly showing a plan priced
 * at a rate the server rejected is worse than a moment's latency.
 */
export interface PeopleStore {
  readonly ready: Promise<void>;
  employees(): readonly Employee[];
  findEmployee(employeeId: EmployeeId): Employee | undefined;
  rateRecordsOf(employeeId: EmployeeId): readonly RateRecord[];
  timelineOf(employeeId: EmployeeId): RateTimeline;
  /** Notified on every change, with the employees whose rates moved. */
  subscribe(listener: (changed: readonly EmployeeId[]) => void): Unsubscribe;
  createRateRecord(input: CreateRateRecordInput): Promise<void>;
  updateRateRecord(rateRecordId: RateRecordId, input: UpdateRateRecordInput): Promise<void>;
  deleteRateRecord(rateRecordId: RateRecordId): Promise<void>;
  /** Increments on every change. Cheap identity for `useSyncExternalStore`. */
  revision(): number;
}

export function createPeopleStore(client: PeopleClient): PeopleStore {
  let employees: readonly Employee[] = [];
  let rateRecords: readonly RateRecord[] = [];
  let timelines = new Map<EmployeeId, RateTimeline>();
  let revision = 0;

  const listeners = new Set<(changed: readonly EmployeeId[]) => void>();

  const rebuild = (): void => {
    const byEmployee = new Map<EmployeeId, RateRecord[]>();

    for (const record of rateRecords) {
      const records = byEmployee.get(record.employeeId) ?? [];

      records.push(record);
      byEmployee.set(record.employeeId, records);
    }

    timelines = new Map(
      employees.map((employee) => [
        employee.id,
        buildRateTimeline(byEmployee.get(employee.id) ?? []),
      ])
    );
    revision += 1;
  };

  const hydrate = async (): Promise<void> => {
    const snapshot = await client.fetchSnapshot();

    employees = [...snapshot.employees].sort((a, b) => a.name.localeCompare(b.name));
    rateRecords = snapshot.rateRecords;
    rebuild();
  };

  const announce = (changed: readonly EmployeeId[]): void => {
    for (const listener of [...listeners]) {
      listener(changed);
    }
  };

  const refreshAfter = async (changed: readonly EmployeeId[]): Promise<void> => {
    await hydrate();
    announce(changed);
  };

  return {
    ready: hydrate(),

    employees: () => employees,
    findEmployee: (employeeId) => employees.find((employee) => employee.id === employeeId),
    rateRecordsOf: (employeeId) =>
      timelines.get(employeeId)?.records ?? [],
    timelineOf: (employeeId) => timelines.get(employeeId) ?? buildRateTimeline([]),
    revision: () => revision,

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    async createRateRecord(input) {
      const created = await client.createRateRecord(input);

      await refreshAfter([created.employeeId]);
    },

    async updateRateRecord(rateRecordId, input) {
      const updated = await client.updateRateRecord(rateRecordId, input);

      await refreshAfter([updated.employeeId]);
    },

    async deleteRateRecord(rateRecordId) {
      const owner = rateRecords.find((record) => record.id === rateRecordId)?.employeeId;

      await client.deleteRateRecord(rateRecordId);
      await refreshAfter(owner ? [owner] : []);
    },
  };
}
