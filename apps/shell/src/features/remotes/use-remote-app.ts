import type { RemoteAppProps } from '@repo/platform';
import { useEffect, useState, type ComponentType } from 'react';

import type { RemoteDescriptor } from '../../config/runtime-config';
import { loadRemoteApp } from '../../federation/remote-loader';

export type RemoteAppState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly Component: ComponentType<RemoteAppProps> }
  | { readonly status: 'failed'; readonly message: string };

const LOADING: RemoteAppState = { status: 'loading' };

/**
 * Load a remote's UI on navigation.
 *
 * Deliberately not `React.lazy`: `lazy` caches its promise for the life of the component it
 * creates, including a rejection, so a remote that failed once could never recover without a page
 * reload — exactly the thing the fault-injection switch exists to let a reviewer undo. Loading
 * explicitly also routes an App that fails to load through the same panel as a bootstrap that
 * failed, rather than through a Suspense boundary that says nothing useful.
 *
 * The result carries the key it belongs to, so switching remotes reads as "loading" during render
 * rather than needing a reset written back into state from inside the effect.
 */
export function useRemoteApp(remote: RemoteDescriptor, enabled: boolean): RemoteAppState {
  const [loaded, setLoaded] = useState<{ key: string; state: RemoteAppState } | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    loadRemoteApp(remote)
      .then((module) => {
        if (!cancelled) {
          setLoaded({ key: remote.key, state: { status: 'ready', Component: module.default } });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoaded({
            key: remote.key,
            state: {
              status: 'failed',
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [remote, enabled]);

  return loaded?.key === remote.key ? loaded.state : LOADING;
}
