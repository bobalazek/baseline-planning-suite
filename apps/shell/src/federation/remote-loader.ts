import { loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';
import type {
  PlatformHost,
  RemoteAppProps,
  RemoteBootstrap,
  RemoteRegistration,
} from '@repo/platform';
import type { ComponentType } from 'react';

import type { RemoteDescriptor } from '../config/runtime-config';
import { brokenEntryFor } from './fault-injection';

/**
 * Loading a remote, in two halves.
 *
 * `./bootstrap` is headless and tiny, and the shell loads **both** remotes' bootstraps at startup
 * so each app's published contract is available before either app's screen has been opened. That is
 * what makes People able to flag over-capacity from Delivery's numbers on first paint (R5, F8).
 *
 * `./App` is the UI, loaded only when the planner navigates to it.
 */
export interface RemoteHandle {
  readonly descriptor: RemoteDescriptor;
  readonly registration: RemoteRegistration;
}

export function registerRemoteEntries(
  remotes: readonly RemoteDescriptor[],
  broken: ReadonlySet<string>
): void {
  registerRemotes(
    remotes.map((remote) => ({
      name: remote.name,
      alias: remote.key,
      entry: broken.has(remote.key) ? brokenEntryFor(remote) : remote.entry,
    })),
    // Replace anything registered before, so toggling a fault takes effect without a fresh page.
    { force: true }
  );
}

export async function bootstrapRemote(
  remote: RemoteDescriptor,
  host: PlatformHost
): Promise<RemoteHandle> {
  const module = await loadRemote<{ register?: unknown }>(`${remote.key}/bootstrap`);

  if (!module || typeof module.register !== 'function') {
    throw new Error(`${remote.label} loaded but does not export register()`);
  }

  const registration = (module.register as RemoteBootstrap)(host);

  await registration.ready;

  return { descriptor: remote, registration };
}

export async function loadRemoteApp(
  remote: RemoteDescriptor
): Promise<{ default: ComponentType<RemoteAppProps> }> {
  const module = await loadRemote<{ default?: unknown }>(`${remote.key}/App`);

  if (!module || typeof module.default !== 'function') {
    throw new Error(`${remote.label} does not expose an App component`);
  }

  return module as { default: ComponentType<RemoteAppProps> };
}
