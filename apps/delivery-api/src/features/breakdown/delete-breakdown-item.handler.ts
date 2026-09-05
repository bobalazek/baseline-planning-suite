import type { BreakdownItemId } from '@repo/shared-common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { DeliveryManager } from '../plan/delivery-manager';

export function handleDeleteBreakdownItem(manager: DeliveryManager) {
  return async (
    request: FastifyRequest<{ Params: { breakdownItemId: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    await manager.deleteBreakdownItem(request.params.breakdownItemId as BreakdownItemId);

    reply.code(204);
  };
}
