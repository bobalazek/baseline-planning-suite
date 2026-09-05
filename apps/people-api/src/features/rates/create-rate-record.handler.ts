import { createRateRecordSchema } from '@repo/people-contracts';
import { ApiError } from '@repo/shared-backend';
import type { RateRecord } from '@repo/shared-common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { PeopleManager } from '../register/people-manager';

export function handleCreateRateRecord(manager: PeopleManager) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<RateRecord> => {
    const parsed = createRateRecordSchema.safeParse(request.body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid rate record',
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      );
    }

    reply.code(201);

    return manager.createRateRecord(parsed.data);
  };
}
