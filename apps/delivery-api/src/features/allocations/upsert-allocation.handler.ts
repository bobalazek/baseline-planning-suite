import { upsertAllocationSchema } from '@repo/delivery-contracts';
import { ApiError } from '@repo/shared-backend';
import type { Allocation } from '@repo/shared-common';
import type { FastifyRequest } from 'fastify';

import type { DeliveryManager } from '../plan/delivery-manager';

/** One editable cell of the staffing grid. Amount zero clears it (F6). */
export function handleUpsertAllocation(manager: DeliveryManager) {
  return async (request: FastifyRequest): Promise<{ allocation: Allocation | null }> => {
    const parsed = upsertAllocationSchema.safeParse(request.body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid allocation',
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      );
    }

    return { allocation: await manager.upsertAllocation(parsed.data) };
  };
}
