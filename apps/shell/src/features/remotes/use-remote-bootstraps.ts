import type { PlatformHost } from '@repo/platform';
import { useEffect, useState } from 'react';

import type { RemoteDescriptor } from '../../config/runtime-config';
import { bootstrapRemote, registerRemoteEntries } from '../../federation/remote-loader';

export type RemoteState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready' }
  | { readonly status: 'failed'; readonly message: string };

export type RemoteStates = Readonly<Record<string, RemoteState>>;

/**
 * Bring up both remotes' published contracts, independently.
 *
 * Each is loaded on its own promise and its own state entry: one failing says nothing about the
 * other, and the shell itself never depends on either succeeding. This is the whole of the
 * isolation requirement (F9) — there is no try/catch scattered through the UI, because "that remote
 * is not here" is a state the shell always knew how to render.
 */
export function useRemoteBootstraps(
  remotes: readonly RemoteDescriptor[],
  host: PlatformHost,
  broken: ReadonlySet<string>
): RemoteStates {
  const [states, setStates] = useState<RemoteStates>(() =>
    Object.fromEntries(remotes.map((remote) => [remote.key, { status: 'loading' } as RemoteState]))
  );

  useEffect(() => {
    let cancelled = false;

    setStates(
      Object.fromEntries(remotes.map((remote) => [remote.key, { status: 'loading' } as RemoteState]))
    );

    registerRemoteEntries(remotes, broken);

    const registrations = remotes.map(async (remote) => {
      try {
        const handle = await bootstrapRemote(remote, host);

        if (!cancelled) {
          setStates((current) => ({ ...current, [remote.key]: { status: 'ready' } }));
        }

        return handle;
      } catch (error) {
        if (!cancelled) {
          setStates((current) => ({
            ...current,
            [remote.key]: { status: 'failed', message: describe(error) },
          }));
        }

        return null;
      }
    });

    return () => {
      cancelled = true;

      // Tear the contracts down so a re-registration cannot leave a stale provider behind.
      void Promise.all(registrations).then((handles) => {
        for (const handle of handles) {
          handle?.registration.dispose();
        }
      });
    };
  }, [remotes, host, broken]);

  return states;
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
