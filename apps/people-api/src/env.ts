import { loadEnv } from '@repo/shared-backend';
import { z } from 'zod';

/**
 * People's configuration. Everything is supplied by the container; nothing is baked into the
 * bundle. This module is the only place the service reads `process.env`.
 */
const envSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.string().default('info'),
  /** Where People's own store lives. Its own volume — Delivery cannot reach it. */
  PEOPLE_DATA_PATH: z.string().default('./data/people.json'),
  /** Read once, on first boot, to seed an empty store. */
  SEED_PATH: z.string().default('./fixtures/baseline-seed.json'),
});

export type Env = z.infer<typeof envSchema>;

export function loadPeopleEnv(): Env {
  return loadEnv(envSchema);
}
