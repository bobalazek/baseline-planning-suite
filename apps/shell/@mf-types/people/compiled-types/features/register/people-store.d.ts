import type { CreateRateRecordInput, UpdateRateRecordInput } from '@repo/people-contracts';
import { type RateTimeline } from '@repo/people-domain';
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
/**
 * An immutable view of the register. A new object appears on every change and the same one is
 * returned in between — the contract `useSyncExternalStore` wants, so no revision counter has to be
 * smuggled into a dependency array.
 */
export interface RegisterSnapshot {
    readonly revision: number;
    readonly employees: readonly Employee[];
}
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
export declare function createPeopleStore(client: PeopleClient): PeopleStore;
