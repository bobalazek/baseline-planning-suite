import { peopleSnapshotSchema, type PeopleSnapshot } from '@repo/people-contracts';
import {
  ApiError,
  createJsonDocumentStore,
  createLoggerOptions,
  toApiErrorBody,
  type DocumentStore,
} from '@repo/shared-backend';
import Fastify, { type FastifyInstance } from 'fastify';

import type { Env } from './env';
import { createPeopleManager } from './features/register/people-manager';
import { seedPeopleFromFixture } from './features/register/people-seed';
import { registerRoutes } from './routes';

export interface BuiltServer {
  readonly server: FastifyInstance;
  readonly store: DocumentStore<PeopleSnapshot>;
}

export async function buildServer(env: Env): Promise<BuiltServer> {
  const server = Fastify({ logger: createLoggerOptions('people-api', env.LOG_LEVEL) });

  // One error hook, so no handler ever hand-rolls a response envelope.
  server.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send(toApiErrorBody(error));
    }

    request.log.error({ err: error }, 'unhandled error');

    return reply.code(500).send(toApiErrorBody(new ApiError(500, 'Internal error')));
  });

  const store = await createJsonDocumentStore({
    filePath: env.PEOPLE_DATA_PATH,
    schema: peopleSnapshotSchema,
    seed: () => seedPeopleFromFixture(env.SEED_PATH),
    onSeeded: (snapshot) =>
      server.log.info(
        { employees: snapshot.employees.length, rateRecords: snapshot.rateRecords.length },
        'seeded People store from fixture'
      ),
  });

  registerRoutes(server, createPeopleManager(store));

  return { server, store };
}
