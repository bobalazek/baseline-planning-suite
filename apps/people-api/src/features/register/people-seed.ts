import { readFile } from 'node:fs/promises';

import { peopleSnapshotSchema, type PeopleSnapshot } from '@repo/people-contracts';

/**
 * Seed People's store from the shipped fixture, taking **only the two collections People owns**.
 *
 * The fixture is one file because the exercise ships one file. The service reading it is not: it
 * never learns that projects or allocations exist, so nothing in People can accidentally come to
 * depend on Delivery's data.
 */
export async function seedPeopleFromFixture(seedPath: string): Promise<PeopleSnapshot> {
  const raw: unknown = JSON.parse(await readFile(seedPath, 'utf8'));

  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Seed file ${seedPath} is not an object`);
  }

  const { employees, rateRecords } = raw as Record<string, unknown>;

  return peopleSnapshotSchema.parse({ employees, rateRecords });
}
