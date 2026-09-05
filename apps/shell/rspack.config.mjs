import { createFrontendConfig } from '@repo/rspack-config';

/**
 * The host. Note the absence of a `remotes` block: it is built knowing nothing about where People
 * and Delivery live, and learns that from `/config.json` at runtime.
 */
export default createFrontendConfig({
  appDirectory: import.meta.dirname,
  name: 'shell',
  port: 5001,
  title: 'Baseline Planning Suite',
  // Dev only: the shell's origin is where the browser runs, so it proxies both services the way the
  // gateway does in the compose stack.
  proxy: [
    {
      context: ['/api/people'],
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
      pathRewrite: { '^/api/people': '' },
    },
    {
      context: ['/api/delivery'],
      target: 'http://127.0.0.1:3002',
      changeOrigin: true,
      pathRewrite: { '^/api/delivery': '' },
    },
  ],
});
