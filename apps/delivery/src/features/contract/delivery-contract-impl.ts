import { DELIVERY_CONTRACT_VERSION, type DeliveryContract } from '@repo/delivery-contracts';
import { oversubscribedEmployeeIds, utilisationAt, utilisationFor } from '@repo/delivery-domain';

import type { DeliveryStore } from '../plan/delivery-store';

/**
 * What Delivery publishes: how loaded a person is, and nothing else.
 *
 * People has no business reading a plan — not the projects, not the breakdown, not who is on what.
 * It needs one number per person per month, and that is what crosses the line.
 */
export function createDeliveryContract(store: DeliveryStore): DeliveryContract {
  return {
    version: DELIVERY_CONTRACT_VERSION,

    utilisationFor: (employeeId) => utilisationFor(store.utilisation(), employeeId),
    utilisationAt: (employeeId, month) => utilisationAt(store.utilisation(), employeeId, month),
    oversubscribedEmployeeIds: () => oversubscribedEmployeeIds(store.utilisation()),
  };
}
