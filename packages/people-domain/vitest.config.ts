import { createNodeConfig } from '@repo/vitest-config';

export default createNodeConfig({
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov', 'json-summary'],
    include: ['src/features/**'],
    thresholds: { lines: 95, functions: 95, branches: 90, statements: 95 },
  },
});
