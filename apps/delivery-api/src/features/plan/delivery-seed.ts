import { readFile } from 'node:fs/promises';

import { deliverySnapshotSchema, type DeliverySnapshot } from '@repo/delivery-contracts';

/**
 * Seed Delivery's store from the shipped fixture, taking only the three collections Delivery owns.
 * The service never reads `employees` or `rateRecords`; it could not price a plan if it wanted to.
 *
 * The fixture's allocations carry no timestamp. R5 has to name "the most recently edited allocation
 * contributing to that person-month", so every seeded row is stamped with the same instant: nobody
 * has edited anything yet, and pretending otherwise would invent an author.
 */
export const SEED_TIMESTAMP = '2026-01-01T00:00:00.000Z';
export const SEED_ACTOR = 'seed';

export async function seedDeliveryFromFixture(seedPath: string): Promise<DeliverySnapshot> {
  const raw: unknown = JSON.parse(await readFile(seedPath, 'utf8'));

  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Seed file ${seedPath} is not an object`);
  }

  const { projects, breakdownItems, allocations } = raw as Record<string, unknown>;

  return deliverySnapshotSchema.parse({
    projects,
    breakdownItems,
    allocations: (allocations as Record<string, unknown>[] | undefined)?.map((allocation) => ({
      ...allocation,
      updatedAt: SEED_TIMESTAMP,
      updatedBy: SEED_ACTOR,
    })),
  });
}
