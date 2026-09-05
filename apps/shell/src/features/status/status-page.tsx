import type { PlatformHost } from '@repo/platform';

import type { RemoteDescriptor } from '../../config/runtime-config';
import type { RemoteStates } from '../remotes/use-remote-bootstraps';

interface Props {
  readonly remotes: readonly RemoteDescriptor[];
  readonly states: RemoteStates;
  readonly host: PlatformHost;
  readonly broken: ReadonlySet<string>;
  readonly onToggleBroken: (key: string) => void;
}

/**
 * The shell's own screen: what loaded, from where, which contracts are published, and the switch
 * that breaks a remote on purpose (F9).
 */
export function StatusPage({ remotes, states, host, broken, onToggleBroken }: Props) {
  const provided = host.registry.provided();

  return (
    <div className="shell-status">
      <section>
        <h2>Remotes</h2>
        <p className="shell-hint">
          Entry URLs come from <code>config.json</code>, which the container writes from environment
          variables. Nothing here was decided when the shell was built.
        </p>
        <table className="shell-table">
          <thead>
            <tr>
              <th>Application</th>
              <th>Status</th>
              <th>Entry</th>
              <th>Break it</th>
            </tr>
          </thead>
          <tbody>
            {remotes.map((remote) => {
              const state = states[remote.key] ?? { status: 'loading' as const };

              return (
                <tr key={remote.key}>
                  <td>{remote.label}</td>
                  <td>
                    <span className={`shell-badge shell-badge--${state.status}`}>
                      {state.status}
                    </span>
                    {state.status === 'failed' ? (
                      <div className="shell-hint">{state.message}</div>
                    ) : null}
                  </td>
                  <td>
                    <code className="shell-entry">{remote.entry}</code>
                  </td>
                  <td>
                    <label className="shell-switch">
                      <input
                        type="checkbox"
                        checked={broken.has(remote.key)}
                        onChange={() => onToggleBroken(remote.key)}
                      />
                      <span>Point at a URL that 404s</span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Published contracts</h2>
        <p className="shell-hint">
          The two applications never import each other. They meet here, at contracts registered with
          the shell at runtime.
        </p>
        {provided.length === 0 ? (
          <p>Nothing is published. Both applications are unavailable.</p>
        ) : (
          <ul className="shell-list">
            {provided.map((id) => (
              <li key={id}>
                <code>{id}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Trying it</h2>
        <ol className="shell-steps">
          <li>
            Break <strong>People</strong> and open <strong>Delivery</strong>: the grid still shows
            person-months and % of capacity, and says so where cost would be.
          </li>
          <li>
            Break <strong>Delivery</strong> and open <strong>People</strong>: the register still
            works, and the utilisation column reports that it is unavailable.
          </li>
          <li>
            Edit a rate in <strong>People</strong>, then open <strong>Delivery</strong>: every cost
            for that person has already changed. No reload.
          </li>
        </ol>
        <p className="shell-hint">
          The switch above is also a query parameter: <code>?break=people,delivery</code>.
        </p>
      </section>
    </div>
  );
}
