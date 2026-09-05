import { updateRateRecordSchema } from '@repo/people-contracts';
import { ApiError } from '@repo/shared-backend';
import type { RateRecord } from '@repo/shared-common';
import type { FastifyRequest } from 'fastify';

import type { PeopleManager } from '../register/people-manager';

/** Corrections, including retroactive ones — R1 explicitly allows editing the past (F4). */
export function handleUpdateRateRecord(manager: PeopleManager) {
  return async (
    request: FastifyRequest<{ Params: { rateRecordId: string } }>
  ): Promise<RateRecord> => {
    const parsed = updateRateRecordSchema.safeParse(request.body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid rate record update',
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      );
    }

    return manager.updateRateRecord(request.params.rateRecordId, parsed.data);
  };
}
