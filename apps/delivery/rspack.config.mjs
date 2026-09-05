import { createFrontendConfig } from '@repo/rspack-config';

/**
 * One build, two ways in:
 *
 *   ./bootstrap  headless — registers Delivery's contract with whatever host loaded it
 *   ./App        the UI
 *
 * plus the `standalone` entry, which constructs a host of its own and calls the same two. Nothing
 * in `src/` knows which path it is on.
 */
export default createFrontendConfig({
  appDirectory: import.meta.dirname,
  name: 'delivery',
  port: 5003,
  title: 'Baseline · Delivery',
  exposes: {
    './bootstrap': './src/bootstrap.ts',
    './App': './src/App.tsx',
  },
  // Dev only. In the compose stack the gateway owns this routing, which is why the client uses a
  // relative path and needs no origin configured.
  proxy: [
    {
      context: ['/api/delivery'],
      target: 'http://127.0.0.1:3002',
      changeOrigin: true,
      pathRewrite: { '^/api/delivery': '' },
    },
  ],
});
