import type {
  CreateRateRecordInput,
  PeopleSnapshot,
  UpdateRateRecordInput,
} from '@repo/people-contracts';
import { ApiError, type DocumentStore } from '@repo/shared-backend';
import type { RateRecord, RateRecordId } from '@repo/shared-common';

/**
 * Everything the service can do to People's data.
 *
 * The rules enforced here are the ones that must hold no matter who is asking: an employee that
 * exists, a rate record that exists, and at most one rate per person per day. The pricing rules
 * (R1) are deliberately *not* here — they are pure functions in `@repo/people-domain`, tested
 * without a server, and used by whoever needs a price.
 */
export interface PeopleManager {
  snapshot(): PeopleSnapshot;
  createRateRecord(input: CreateRateRecordInput): Promise<RateRecord>;
  updateRateRecord(rateRecordId: string, input: UpdateRateRecordInput): Promise<RateRecord>;
  deleteRateRecord(rateRecordId: string): Promise<void>;
}

export function createPeopleManager(store: DocumentStore<PeopleSnapshot>): PeopleManager {
  const nextRateRecordId = (snapshot: PeopleSnapshot): RateRecordId => {
    const highest = snapshot.rateRecords.reduce((max, record) => {
      const numeric = Number(record.id.replace(/\D/g, ''));

      return Number.isFinite(numeric) && numeric > max ? numeric : max;
    }, 0);

    return `rate-${String(highest + 1).padStart(3, '0')}` as RateRecordId;
  };

  const assertNoDuplicate = (
    snapshot: PeopleSnapshot,
    record: Pick<RateRecord, 'employeeId' | 'validFrom'>,
    ignoreId?: string
  ): void => {
    const clash = snapshot.rateRecords.find(
      (candidate) =>
        candidate.employeeId === record.employeeId &&
        candidate.validFrom === record.validFrom &&
        candidate.id !== ignoreId
    );

    if (clash) {
      throw ApiError.conflict(
        `A rate for this employee already starts on ${record.validFrom}. ` +
          'Two rates cannot claim the same day.'
      );
    }
  };

  return {
    snapshot: () => store.read(),

    async createRateRecord(input) {
      const current = store.read();

      if (!current.employees.some((employee) => employee.id === input.employeeId)) {
        throw ApiError.notFound(`No employee ${input.employeeId}`);
      }

      assertNoDuplicate(current, input);

      const created: RateRecord = { id: nextRateRecordId(current), ...input };

      await store.update((snapshot) => ({
        ...snapshot,
        rateRecords: [...snapshot.rateRecords, created],
      }));

      return created;
    },

    async updateRateRecord(rateRecordId, input) {
      const current = store.read();
      const existing = current.rateRecords.find((record) => record.id === rateRecordId);

      if (!existing) {
        throw ApiError.notFound(`No rate record ${rateRecordId}`);
      }

      const updated: RateRecord = {
        ...existing,
        ...(input.validFrom === undefined ? {} : { validFrom: input.validFrom }),
        ...(input.hourlyCost === undefined ? {} : { hourlyCost: input.hourlyCost }),
      };

      assertNoDuplicate(current, updated, rateRecordId);

      await store.update((snapshot) => ({
        ...snapshot,
        rateRecords: snapshot.rateRecords.map((record) =>
          record.id === rateRecordId ? updated : record
        ),
      }));

      return updated;
    },

    async deleteRateRecord(rateRecordId) {
      if (!store.read().rateRecords.some((record) => record.id === rateRecordId)) {
        throw ApiError.notFound(`No rate record ${rateRecordId}`);
      }

      await store.update((snapshot) => ({
        ...snapshot,
        rateRecords: snapshot.rateRecords.filter((record) => record.id !== rateRecordId),
      }));
    },
  };
}
