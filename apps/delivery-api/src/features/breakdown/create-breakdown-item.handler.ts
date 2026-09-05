import { createBreakdownItemSchema } from '@repo/delivery-contracts';
import { ApiError } from '@repo/shared-backend';
import type { BreakdownItem } from '@repo/shared-common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { DeliveryManager } from '../plan/delivery-manager';

export function handleCreateBreakdownItem(manager: DeliveryManager) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<BreakdownItem> => {
    const parsed = createBreakdownItemSchema.safeParse(request.body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid work package',
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      );
    }

    reply.code(201);

    return manager.createBreakdownItem(parsed.data);
  };
}
