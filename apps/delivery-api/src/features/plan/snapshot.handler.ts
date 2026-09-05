import type { DeliverySnapshot } from '@repo/delivery-contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { DeliveryManager } from './delivery-manager';

/**
 * The whole plan in one response, including projects the viewer has not opened, because R5's
 * capacity check is only correct when every project is counted.
 */
export function handleSnapshot(manager: DeliveryManager) {
  return async (_request: FastifyRequest, reply: FastifyReply): Promise<DeliverySnapshot> => {
    reply.header('cache-control', 'no-store');

    return manager.snapshot();
  };
}
