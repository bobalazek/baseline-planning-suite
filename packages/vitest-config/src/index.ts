import { defineConfig, type UserConfig } from 'vitest/config';

type TestConfig = NonNullable<UserConfig['test']>;

export const baseNodeTestConfig: TestConfig = {
  globals: true,
  environment: 'node',
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx', '*.test.ts'],
  exclude: ['**/node_modules/**', '**/dist/**'],
  testTimeout: 10000,
  hookTimeout: 10000,
};

// 50% is a smoke-test floor, not a quality bar — it catches "this package shipped zero tests".
// The packages that carry the domain rules set their own, much higher, thresholds.
export const defaultCoverageConfig = {
  provider: 'v8' as const,
  reporter: ['text', 'lcov', 'json-summary'],
  thresholds: {
    lines: 50,
    functions: 50,
    branches: 50,
    statements: 50,
  },
};

export function createNodeConfig(
  overrides: Partial<TestConfig> & { coverage?: TestConfig['coverage'] | true } = {}
): UserConfig {
  const { coverage, ...rest } = overrides;
  const resolvedCoverage = coverage === true ? defaultCoverageConfig : (coverage ?? undefined);

  return defineConfig({
    test: {
      ...baseNodeTestConfig,
      ...rest,
      ...(resolvedCoverage ? { coverage: resolvedCoverage } : {}),
    },
  });
}
