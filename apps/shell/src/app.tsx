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
        </nav>

        <SessionControls
          session={host.session}
          currencies={config.currencies}
          actors={config.actors}
        />
      </header>

      <main className="shell-main">
        {active ? (
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
