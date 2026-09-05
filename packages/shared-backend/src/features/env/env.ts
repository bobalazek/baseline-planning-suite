import type { ZodType } from 'zod';

/**
 * The one place in the repo that reads `process.env`.
 *
 * Everything a service needs is declared as a schema and parsed once at boot, so a missing or
 * malformed variable stops the container immediately with a readable message instead of surfacing
 * as `undefined` somewhere in a request three hours later.
 */
export function loadEnv<TEnv>(schema: ZodType<TEnv>): TEnv {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment:\n${problems}`);
  }

  return result.data;
}
