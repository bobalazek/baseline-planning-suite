import type { PeopleSnapshot } from '@repo/people-contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { PeopleManager } from './people-manager';

/** The whole register in one response. The client hydrates from it and then serves the contract. */
export function handleSnapshot(manager: PeopleManager) {
  return async (_request: FastifyRequest, reply: FastifyReply): Promise<PeopleSnapshot> => {
    reply.header('cache-control', 'no-store');

    return manager.snapshot();
  };
}
