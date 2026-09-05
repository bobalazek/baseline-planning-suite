import type { PlatformHost } from '@repo/platform';

import type { RemoteDescriptor } from '../../config/runtime-config';
import { RemoteErrorBoundary } from './remote-error-boundary';
import type { RemoteState } from './use-remote-bootstraps';
import { useRemoteApp } from './use-remote-app';

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
  const app = useRemoteApp(remote, state.status === 'ready');

  if (state.status === 'failed') {
    return <FailurePanel remote={remote} message={state.message} />;
  }

  if (state.status === 'loading' || app.status === 'loading') {
    return (
      <div className="shell-panel shell-panel--loading">
        <p>Loading {remote.label}…</p>
      </div>
    );
  }

  if (app.status === 'failed') {
    return <FailurePanel remote={remote} message={app.message} />;
  }

  const { Component } = app;

  return (
    <RemoteErrorBoundary label={remote.label}>
      <Component host={host} />
    </RemoteErrorBoundary>
  );
}

function FailurePanel({ remote, message }: { remote: RemoteDescriptor; message: string }) {
  return (
    <div className="shell-panel shell-panel--failed" role="alert">
      <h2>{remote.label} could not be loaded</h2>
      <p>
        The shell is still running. Navigation, the display currency and the other application are
        unaffected; anything that depends on {remote.label}&rsquo;s data will say so where the number
        would have been.
      </p>
      <pre>{message}</pre>
    </div>
  );
}
