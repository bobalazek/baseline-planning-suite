import type { CreateRateRecordInput, UpdateRateRecordInput } from '@repo/people-contracts';
import { buildRateTimeline, type RateTimeline } from '@repo/people-domain';
import type { Unsubscribe } from '@repo/platform';
import type { Employee, EmployeeId, RateRecord, RateRecordId } from '@repo/shared-common';

import type { PeopleClient } from './people-client';

/**
 * An immutable view of the register. A new object appears on every change and the same one is
 * returned in between, the contract `useSyncExternalStore` wants, so no revision counter has to be
 * smuggled into a dependency array.
 */
export interface RegisterSnapshot {
  readonly revision: number;
  readonly employees: readonly Employee[];
}

/**
 * People's hydrated projection of its own service. The published contract is served from here
 * synchronously; a promise per lookup would be unusable on the consuming side, where a grid asks
 * for a price hundreds of times in one render.
 *
 * Mutations write through and re-read. Nothing is optimistic: a rate feeds every cost in the suite,
 * and briefly showing a plan priced at a rate the server rejected is worse than a little latency.
 */
export interface PeopleStore {
  readonly ready: Promise<void>;
  snapshot(): RegisterSnapshot;
  employees(): readonly Employee[];
  findEmployee(employeeId: EmployeeId): Employee | undefined;
  rateRecordsOf(employeeId: EmployeeId): readonly RateRecord[];
  timelineOf(employeeId: EmployeeId): RateTimeline;
  /** Notified on every change, with the employees whose rates moved. */
  subscribe(listener: (changed: readonly EmployeeId[]) => void): Unsubscribe;
  createRateRecord(input: CreateRateRecordInput): Promise<void>;
  updateRateRecord(rateRecordId: RateRecordId, input: UpdateRateRecordInput): Promise<void>;
  deleteRateRecord(rateRecordId: RateRecordId): Promise<void>;
}

export function createPeopleStore(client: PeopleClient): PeopleStore {
  let employees: readonly Employee[] = [];
  let rateRecords: readonly RateRecord[] = [];
  let timelines = new Map<EmployeeId, RateTimeline>();
  let snapshot: RegisterSnapshot = { revision: 0, employees: [] };

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
    snapshot = { revision: snapshot.revision + 1, employees };
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

    snapshot: () => snapshot,
    employees: () => employees,
    findEmployee: (employeeId) => employees.find((employee) => employee.id === employeeId),
    rateRecordsOf: (employeeId) => timelines.get(employeeId)?.records ?? [],
    timelineOf: (employeeId) => timelines.get(employeeId) ?? buildRateTimeline([]),

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
