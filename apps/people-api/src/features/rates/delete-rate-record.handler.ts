import type { FastifyReply, FastifyRequest } from 'fastify';

import type { PeopleManager } from '../register/people-manager';

export function handleDeleteRateRecord(manager: PeopleManager) {
  return async (
    request: FastifyRequest<{ Params: { rateRecordId: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    await manager.deleteRateRecord(request.params.rateRecordId);

    reply.code(204);
  };
}
