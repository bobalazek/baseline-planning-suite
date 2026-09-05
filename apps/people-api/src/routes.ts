import type { FastifyInstance } from 'fastify';

import { handleCreateRateRecord } from './features/rates/create-rate-record.handler';
import { handleDeleteRateRecord } from './features/rates/delete-rate-record.handler';
import { handleUpdateRateRecord } from './features/rates/update-rate-record.handler';
import type { PeopleManager } from './features/register/people-manager';
import { handleSnapshot } from './features/register/snapshot.handler';

/**
 * People's whole HTTP surface. It is small on purpose: the register is read as one snapshot, and
 * the only thing anybody may write is rate history.
 */
export function registerRoutes(server: FastifyInstance, manager: PeopleManager): void {
  server.get('/health', async () => ({ status: 'ok', service: 'people-api' }));

  server.get('/snapshot', handleSnapshot(manager));

  server.post('/rate-records', handleCreateRateRecord(manager));
  server.patch<{ Params: { rateRecordId: string } }>(
    '/rate-records/:rateRecordId',
    handleUpdateRateRecord(manager)
  );
  server.delete<{ Params: { rateRecordId: string } }>(
    '/rate-records/:rateRecordId',
    handleDeleteRateRecord(manager)
  );
}
