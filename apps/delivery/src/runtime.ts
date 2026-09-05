import type { DeliveryContract } from '@repo/delivery-contracts';

import type { DeliveryStore } from './features/plan/delivery-store';

/** What `register` builds and `./App` consumes, for one host. */
export interface DeliveryRuntime {
  readonly store: DeliveryStore;
  readonly contract: DeliveryContract;
}
