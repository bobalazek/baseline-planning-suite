import { updateBreakdownItemSchema } from '@repo/delivery-contracts';
import { ApiError } from '@repo/shared-backend';
import type { BreakdownItem, BreakdownItemId } from '@repo/shared-common';
import type { FastifyRequest } from 'fastify';

import type { DeliveryManager } from '../plan/delivery-manager';

/** Rename and move are the same operation on the wire; only the fields present differ (F5). */
export function handleUpdateBreakdownItem(manager: DeliveryManager) {
  return async (
    request: FastifyRequest<{ Params: { breakdownItemId: string } }>
  ): Promise<BreakdownItem> => {
    const parsed = updateBreakdownItemSchema.safeParse(request.body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid work package update',
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      );
    }

    return manager.updateBreakdownItem(
      request.params.breakdownItemId as BreakdownItemId,
      parsed.data
    );
  };
}
