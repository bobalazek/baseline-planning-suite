import type { MutablePlatformHost } from '@repo/platform';
import { useCallback, useState } from 'react';

import type { RuntimeConfig } from './config/runtime-config';
import { readBrokenRemotes, writeBrokenRemotes } from './federation/fault-injection';
import { navigate, useCurrentPath } from './features/navigation/router';
import { RemotePanel } from './features/remotes/remote-panel';
import { useRemoteBootstraps } from './features/remotes/use-remote-bootstraps';
import { SessionControls } from './features/session/session-controls';
import { StatusPage } from './features/status/status-page';

interface Props {
  readonly config: RuntimeConfig;
  readonly host: MutablePlatformHost;
}

export function App({ config, host }: Props) {
  const path = useCurrentPath();
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => readBrokenRemotes());
  const states = useRemoteBootstraps(config.remotes, host, broken);

  const toggleBroken = useCallback((key: string) => {
    setBroken((current) => {
      const next = new Set(current);

      if (!next.delete(key)) {
        next.add(key);
      }

      writeBrokenRemotes(next);

      return next;
    });
  }, []);

  const active = config.remotes.find((remote) => path.startsWith(remote.path));
  // Both remotes mounted at once. This is the view that demonstrates F7 honestly: a rate edited in
  // People has to reach an *open* Delivery cost view, and here it is open while the edit happens.
  const isCombined = path.startsWith(COMBINED_PATH);

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-brand">
          <strong>Baseline</strong>
          <span>Planning Suite</span>
        </div>

        <nav className="shell-nav" aria-label="Applications">
          <NavLink path="/" label="Overview" current={path} />
          {config.remotes.map((remote) => (
            <NavLink
              key={remote.key}
              path={remote.path}
              label={remote.label}
              current={path}
              failed={states[remote.key]?.status === 'failed'}
            />
          ))}
          {config.remotes.length > 1 ? (
            <NavLink path={COMBINED_PATH} label="Side by side" current={path} />
          ) : null}
        </nav>

        <SessionControls
          session={host.session}
          currencies={config.currencies}
          actors={config.actors}
        />
      </header>

      <main className="shell-main">
        {isCombined ? (
          <div className="shell-split">
            <p className="shell-hint shell-split__note">
              Both applications, mounted at once. Change a rate in People and every cost below it
              recomputes in the same render — no reload, and no shared state: Delivery re-reads
              through the published contract because the event told it something changed.
            </p>
            {config.remotes.map((remote) => (
              <section key={remote.key} className="shell-split__pane">
                <h2 className="shell-split__title">{remote.label}</h2>
                <RemotePanel
                  remote={remote}
                  state={states[remote.key] ?? { status: 'loading' }}
                  host={host}
                />
              </section>
            ))}
          </div>
        ) : active ? (
          <RemotePanel
            key={active.key}
            remote={active}
            state={states[active.key] ?? { status: 'loading' }}
            host={host}
          />
        ) : (
          <StatusPage
            remotes={config.remotes}
            states={states}
            host={host}
            broken={broken}
            onToggleBroken={toggleBroken}
          />
        )}
      </main>
    </div>
  );
}

const COMBINED_PATH = '/side-by-side';

function NavLink({
  path,
  label,
  current,
  failed = false,
}: {
  path: string;
  label: string;
  current: string;
  failed?: boolean;
}) {
  const isActive = path === '/' ? current === '/' : current.startsWith(path);

  return (
    <button
      type="button"
      className="shell-navlink"
      aria-current={isActive ? 'page' : undefined}
      onClick={() => navigate(path)}
    >
      {label}
      {failed ? <span className="shell-navlink__warning" title="Failed to load" /> : null}
    </button>
  );
}
