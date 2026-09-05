import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // Workspace packages are consumed as TypeScript source, so they are compiled into the bundle.
  // Only real third-party runtime dependencies stay external.
  noExternal: [/^@repo\//],
});
