import { deliverySnapshotSchema, type DeliverySnapshot } from '@repo/delivery-contracts';
import {
  ApiError,
  createJsonDocumentStore,
  createLoggerOptions,
  toApiErrorBody,
  type DocumentStore,
} from '@repo/shared-backend';
import Fastify, { type FastifyInstance } from 'fastify';

import type { Env } from './env';
import { createDeliveryManager } from './features/plan/delivery-manager';
import { seedDeliveryFromFixture } from './features/plan/delivery-seed';
import { registerRoutes } from './routes';

export interface BuiltServer {
  readonly server: FastifyInstance;
  readonly store: DocumentStore<DeliverySnapshot>;
}

export async function buildServer(env: Env): Promise<BuiltServer> {
  const server = Fastify({ logger: createLoggerOptions('delivery-api', env.LOG_LEVEL) });

  server.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send(toApiErrorBody(error));
    }

    request.log.error({ err: error }, 'unhandled error');

    return reply.code(500).send(toApiErrorBody(new ApiError(500, 'Internal error')));
  });

  const store = await createJsonDocumentStore({
    filePath: env.DELIVERY_DATA_PATH,
    schema: deliverySnapshotSchema,
    seed: () => seedDeliveryFromFixture(env.SEED_PATH),
    onSeeded: (snapshot) =>
      server.log.info(
        {
          projects: snapshot.projects.length,
          breakdownItems: snapshot.breakdownItems.length,
          allocations: snapshot.allocations.length,
        },
        'seeded Delivery store from fixture'
      ),
  });

  registerRoutes(server, createDeliveryManager(store));

  return { server, store };
}
