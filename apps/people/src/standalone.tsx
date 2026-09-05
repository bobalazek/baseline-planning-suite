import { createPlatformHost } from '@repo/platform';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { register } from './bootstrap';

/**
 * People running on its own origin.
 *
 * It builds a `PlatformHost` and calls the same `register` the shell calls, then renders the same
 * `App`. There is no "standalone" flag anywhere in application code — hosting is a parameter, and
 * both paths come out of one build.
 *
 * What is missing standalone is Delivery's contract, so the utilisation panel reports that it is
 * unavailable. That is the same code path as a failed remote in the shell, which makes this the
 * cheapest possible way to exercise it.
 */
const container = document.getElementById('root');

if (!container) {
  throw new Error('No #root element to mount into');
}

const host = createPlatformHost({
  session: {
    currency: { code: 'EUR', symbol: '€', unitsPerEuro: 1 },
    actor: { id: 'usr-standalone', name: 'Standalone planner' },
  },
});

const registration = register(host);

await registration.ready;

createRoot(container).render(
  <StrictMode>
    <App host={host} />
  </StrictMode>
);
