import type { FastifyInstance } from 'fastify';

import { handleUpsertAllocation } from './features/allocations/upsert-allocation.handler';
import { handleCreateBreakdownItem } from './features/breakdown/create-breakdown-item.handler';
import { handleDeleteBreakdownItem } from './features/breakdown/delete-breakdown-item.handler';
import { handleUpdateBreakdownItem } from './features/breakdown/update-breakdown-item.handler';
import type { DeliveryManager } from './features/plan/delivery-manager';
import { handleSnapshot } from './features/plan/snapshot.handler';

export function registerRoutes(server: FastifyInstance, manager: DeliveryManager): void {
  server.get('/health', async () => ({ status: 'ok', service: 'delivery-api' }));

  server.get('/snapshot', handleSnapshot(manager));

  server.put('/allocations', handleUpsertAllocation(manager));

  server.post('/breakdown-items', handleCreateBreakdownItem(manager));
  server.patch<{ Params: { breakdownItemId: string } }>(
    '/breakdown-items/:breakdownItemId',
    handleUpdateBreakdownItem(manager)
  );
  server.delete<{ Params: { breakdownItemId: string } }>(
    '/breakdown-items/:breakdownItemId',
    handleDeleteBreakdownItem(manager)
  );
}
