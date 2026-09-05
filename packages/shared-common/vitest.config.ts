import { createNodeConfig } from '@repo/vitest-config';

export default createNodeConfig({
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov', 'json-summary'],
    include: ['src/features/**'],
    // This package holds the working-day and rounding rules the whole product is priced with.
    thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
  },
});
