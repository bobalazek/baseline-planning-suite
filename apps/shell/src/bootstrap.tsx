import { createPlatformHost } from '@repo/platform';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { loadRuntimeConfig } from './config/runtime-config';
import './styles.css';

/**
 * The shell's real entry point.
 *
 * There is exactly one `PlatformHost` on the page, and this is where it is constructed. Remotes are
 * handed it; they never reach for a shared singleton, which is why the registry cannot end up
 * duplicated across three independently released builds
 * (docs/project/decisions/0004-transport-between-remotes.md).
 */
const container = document.getElementById('root');

if (!container) {
  throw new Error('No #root element to mount into');
}

const root = createRoot(container);

try {
  const config = await loadRuntimeConfig();

  const host = createPlatformHost({
    session: {
      currency: config.currencies[0] ?? { code: 'EUR', symbol: '€', unitsPerEuro: 1 },
      actor: config.actors[0] ?? { id: 'anonymous', name: 'Unassigned planner' },
    },
    onWarning: (message) => console.warn(`[shell] ${message}`),
  });

  root.render(
    <StrictMode>
      <App config={config} host={host} />
    </StrictMode>
  );
} catch (error) {
  // The shell cannot start without its runtime configuration; that is the one dependency it has.
  root.render(
    <div className="shell-panel shell-panel--failed" role="alert">
      <h2>The shell could not read its configuration</h2>
      <p>
        <code>config.json</code> is written by the container at start-up and lists where the remotes
        live. Without it there is nothing to load.
      </p>
      <pre>{error instanceof Error ? error.message : String(error)}</pre>
    </div>
  );
}
