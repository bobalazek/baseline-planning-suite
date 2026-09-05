import { z } from 'zod';

/**
 * Everything the shell learns at runtime rather than at build time.
 *
 * The hard constraint is that remote URLs "resolve at runtime from container configuration, never
 * from the bundle". `/config.json` is a static file the container's entrypoint writes from
 * environment variables, so the same shell image runs in compose, in staging and in production, and
 * moving People to another host is a restart rather than a rebuild.
 */
const remoteDescriptorSchema = z.object({
  /** Stable key used in URLs and in the fault-injection switch. */
  key: z.string().min(1),
  /** Module Federation container name. Must match the remote's build. */
  name: z.string().min(1),
  label: z.string().min(1),
  path: z.string().startsWith('/'),
  entry: z.string().min(1),
});

const currencySchema = z.object({
  code: z.string().min(1),
  symbol: z.string().min(1),
  unitsPerEuro: z.number().positive(),
});

const actorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const runtimeConfigSchema = z.object({
  remotes: z.array(remoteDescriptorSchema).min(1),
  currencies: z.array(currencySchema).min(1),
  actors: z.array(actorSchema).min(1),
});

export type RemoteDescriptor = z.infer<typeof remoteDescriptorSchema>;
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export const CONFIG_URL = 'config.json';

export async function loadRuntimeConfig(url: string = CONFIG_URL): Promise<RuntimeConfig> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Could not read ${url}: ${response.status} ${response.statusText}`);
  }

  return runtimeConfigSchema.parse(await response.json());
}
