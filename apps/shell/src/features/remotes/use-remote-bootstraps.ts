import type { PlatformHost } from '@repo/platform';
import { useEffect, useMemo, useState } from 'react';

import type { RemoteDescriptor } from '../../config/runtime-config';
import { bootstrapRemote, registerRemoteEntries } from '../../federation/remote-loader';

export type RemoteState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready' }
  | { readonly status: 'failed'; readonly message: string };

export type RemoteStates = Readonly<Record<string, RemoteState>>;

const LOADING: RemoteState = { status: 'loading' };

/**
 * Bring up both remotes' published contracts independently: one failing says nothing about the
 * other, and the shell never depends on either succeeding (F9).
 *
 * Results are stamped with the attempt they belong to, so toggling a fault or changing the config
 * reads as loading during render instead of writing a reset back into state from the effect.
 */
export function useRemoteBootstraps(
  remotes: readonly RemoteDescriptor[],
  host: PlatformHost,
  broken: ReadonlySet<string>
): RemoteStates {
  const attempt = useMemo(
    () => JSON.stringify([remotes.map((remote) => [remote.key, remote.entry]), [...broken].sort()]),
    [remotes, broken]
  );

  const [record, setRecord] = useState<{ attempt: string; states: RemoteStates }>({
    attempt,
    states: {},
  });

  useEffect(() => {
    let cancelled = false;

    registerRemoteEntries(remotes, broken);

    const registrations = remotes.map(async (remote) => {
      try {
        const handle = await bootstrapRemote(remote, host);

        if (!cancelled) {
          setRecord((current) => merge(current, attempt, remote.key, { status: 'ready' }));
        }

        return handle;
      } catch (error) {
        if (!cancelled) {
          setRecord((current) =>
            merge(current, attempt, remote.key, {
              status: 'failed',
              message: error instanceof Error ? error.message : String(error),
            })
          );
        }

        return null;
      }
    });

    return () => {
      cancelled = true;

      // Tear the contracts down, so a re-registration cannot leave a stale provider behind.
      void Promise.all(registrations).then((handles) => {
        for (const handle of handles) {
          handle?.registration.dispose();
        }
      });
    };
  }, [remotes, host, broken, attempt]);

  const states = record.attempt === attempt ? record.states : {};

  return Object.fromEntries(remotes.map((remote) => [remote.key, states[remote.key] ?? LOADING]));
}

function merge(
  current: { attempt: string; states: RemoteStates },
  attempt: string,
  key: string,
  state: RemoteState
): { attempt: string; states: RemoteStates } {
  const states = current.attempt === attempt ? current.states : {};

  return { attempt, states: { ...states, [key]: state } };
}
