import { loadEnv } from '@repo/shared-backend';
import { z } from 'zod';

/** Delivery's configuration. Its store is its own; People has no path to it. */
const envSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3002),
  LOG_LEVEL: z.string().default('info'),
  DELIVERY_DATA_PATH: z.string().default('./data/delivery.json'),
  SEED_PATH: z.string().default('./fixtures/baseline-seed.json'),
});

export type Env = z.infer<typeof envSchema>;

export function loadDeliveryEnv(): Env {
  return loadEnv(envSchema);
}
