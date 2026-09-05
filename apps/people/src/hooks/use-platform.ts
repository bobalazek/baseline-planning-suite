import type { ContractKey, PlatformHost, Session } from '@repo/platform';
import { useEffect, useState, useSyncExternalStore } from 'react';

import type { PeopleStore } from '../features/register/people-store';

/** Re-renders when People's own data changes. */
export function usePeopleRevision(store: PeopleStore): number {
  return useSyncExternalStore(
    (onChange) => store.subscribe(() => onChange()),
    () => store.revision(),
    () => 0
  );
}

/** Display currency and active user, owned by the shell and pushed in at runtime (F2). */
export function useSession(host: PlatformHost): Session {
  return useSyncExternalStore(host.session.subscribe, host.session.current, host.session.current);
}

/**
 * A contract published by the *other* team, which may simply not be there.
 *
 * `undefined` is a first-class answer, not an error state: if Delivery failed to load, People still
 * has a register to show, and the type forces every caller to say what it renders instead (F9).
 */
export function useContract<TContract>(
  host: PlatformHost,
  key: ContractKey<TContract>
): TContract | undefined {
  const [contract, setContract] = useState<TContract | undefined>(() => host.registry.get(key));

  useEffect(() => host.registry.observe(key, setContract), [host, key]);

  return contract;
}

/** Bumps whenever the given event fires, so a view can re-read through a contract. */
export function useEventRevision(
  host: PlatformHost,
  channel: Parameters<PlatformHost['bus']['subscribe']>[0]
): number {
  const [revision, setRevision] = useState(0);

  useEffect(
    () => host.bus.subscribe(channel, () => setRevision((current) => current + 1)),
    [host, channel]
  );

  return revision;
}
