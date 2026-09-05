import { DELIVERY_ALLOCATIONS_CHANGED, DELIVERY_CONTRACT } from '@repo/delivery-contracts';
import type { PlatformHost, RemoteRegistration } from '@repo/platform';

import { createDeliveryContract } from './features/contract/delivery-contract-impl';
import { createDeliveryClient } from './features/plan/delivery-client';
import { createDeliveryStore } from './features/plan/delivery-store';
import type { DeliveryRuntime } from './runtime';

/**
 * The headless half of the Delivery remote. Loaded by the shell at start-up so People can flag
 * over-capacity before Delivery's screen has ever been opened (R5, F8).
 */
export function register(host: PlatformHost): RemoteRegistration {
  const store = createDeliveryStore(createDeliveryClient());
  const contract = createDeliveryContract(store);

  const releaseContract = host.registry.provide(DELIVERY_CONTRACT, contract);

  const unsubscribe = store.subscribe((change) => {
    host.bus.publish(DELIVERY_ALLOCATIONS_CHANGED, {
      employeeIds: change.employeeIds,
      months: change.months,
    });
  });

  runtimeByHost.set(host, { store, contract });

  return {
    ready: store.ready,
    dispose() {
      unsubscribe();
      releaseContract();
      runtimeByHost.delete(host);
    },
  };
}

const runtimeByHost = new WeakMap<PlatformHost, DeliveryRuntime>();

export function runtimeFor(host: PlatformHost): DeliveryRuntime | undefined {
  return runtimeByHost.get(host);
}
