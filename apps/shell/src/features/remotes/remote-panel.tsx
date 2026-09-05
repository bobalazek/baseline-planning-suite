import type { PlatformHost, RemoteAppProps } from '@repo/platform';
import { lazy, Suspense, useMemo, type ComponentType } from 'react';

import type { RemoteDescriptor } from '../../config/runtime-config';
import { loadRemoteApp } from '../../federation/remote-loader';
import { RemoteErrorBoundary } from './remote-error-boundary';
import type { RemoteState } from './use-remote-bootstraps';

interface Props {
  readonly remote: RemoteDescriptor;
  readonly state: RemoteState;
  readonly host: PlatformHost;
}

/**
 * One remote's screen, or an honest message in place of it.
 *
 * The failure case is not an afterthought: it names the app, says what still works, and shows the
 * real loader error, because the point of F9 is that the suite degrades legibly rather than
 * silently.
 */
export function RemotePanel({ remote, state, host }: Props) {
  const App = useMemo<ComponentType<RemoteAppProps>>(
    () => lazy(() => loadRemoteApp(remote)),
    [remote]
  );

  if (state.status === 'loading') {
    return (
      <div className="shell-panel shell-panel--loading">
        <p>Loading {remote.label}…</p>
      </div>
    );
  }

  if (state.status === 'failed') {
    return (
      <div className="shell-panel shell-panel--failed" role="alert">
        <h2>{remote.label} could not be loaded</h2>
        <p>
          The shell is still running. Navigation, the display currency and the other application are
          unaffected; anything that depends on {remote.label}&rsquo;s data will say so where the
          number would have been.
        </p>
        <pre>{state.message}</pre>
      </div>
    );
  }

  return (
    <RemoteErrorBoundary label={remote.label}>
      <Suspense fallback={<div className="shell-panel shell-panel--loading">Loading…</div>}>
        <App host={host} />
      </Suspense>
    </RemoteErrorBoundary>
  );
}
