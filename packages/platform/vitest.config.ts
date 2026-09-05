import { createNodeConfig } from '@repo/vitest-config';

export default createNodeConfig({
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov', 'json-summary'],
    include: ['src/features/**'],
    thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
  },
});
