import { PEOPLE_CONTRACT, PEOPLE_RATES_CHANGED } from '@repo/people-contracts';
import type { PlatformHost, RemoteRegistration } from '@repo/platform';

import { createPeopleContract } from './features/contract/people-contract-impl';
import { createPeopleClient } from './features/register/people-client';
import { createPeopleStore } from './features/register/people-store';
import type { PeopleRuntime } from './runtime';

/**
 * The headless half of the People remote.
 *
 * The shell loads this at start-up for *both* remotes, before either screen has been opened, so
 * Delivery can price a grid the moment it is navigated to and People can flag over-capacity on
 * first paint. Nothing here mounts React.
 */
export function register(host: PlatformHost): RemoteRegistration {
  const store = createPeopleStore(createPeopleClient());
  const contract = createPeopleContract(store);

  const releaseContract = host.registry.provide(PEOPLE_CONTRACT, contract);

  // Ids, never values: a consumer re-reads through the contract, so the two apps cannot end up
  // holding divergent copies of People's state (F7).
  const unsubscribe = store.subscribe((employeeIds) => {
    host.bus.publish(PEOPLE_RATES_CHANGED, { employeeIds });
  });

  const runtime: PeopleRuntime = { store, contract };

  runtimeByHost.set(host, runtime);

  return {
    ready: store.ready,
    dispose() {
      unsubscribe();
      releaseContract();

      // Only retract *this* registration. React's StrictMode mounts an effect, tears it down and
      // mounts it again, and the teardown here is asynchronous, without this guard a stale
      // disposer arrives after the replacement has registered and deletes it, leaving the app
      // rendered against a host it was never registered with.
      if (runtimeByHost.get(host) === runtime) {
        runtimeByHost.delete(host);
      }
    },
  };
}

/**
 * Lets `./App` find the store that `register` built for the same host, without either of them
 * reaching for a module-level singleton that a second host would silently share.
 */
const runtimeByHost = new WeakMap<PlatformHost, PeopleRuntime>();

export function runtimeFor(host: PlatformHost): PeopleRuntime | undefined {
  return runtimeByHost.get(host);
}
