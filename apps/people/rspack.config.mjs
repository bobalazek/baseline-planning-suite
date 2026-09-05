import { createFrontendConfig } from '@repo/rspack-config';

/**
 * One build, two ways in:
 *
 *   ./bootstrap  headless — registers People's contract with whatever host loaded it
 *   ./App        the UI
 *
 * plus the `standalone` entry, which constructs a host of its own and calls the same two. Nothing
 * in `src/` knows which path it is on.
 */
export default createFrontendConfig({
  appDirectory: import.meta.dirname,
  name: 'people',
  port: 5002,
  title: 'Baseline · People',
  exposes: {
    './bootstrap': './src/bootstrap.ts',
    './App': './src/App.tsx',
  },
  // Dev only. In the compose stack the gateway owns this routing, which is why the client uses a
  // relative path and needs no origin configured.
  proxy: [
    {
      context: ['/api/people'],
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
      pathRewrite: { '^/api/people': '' },
    },
  ],
});
