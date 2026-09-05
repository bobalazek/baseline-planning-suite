/**
 * One logger shape for both services.
 *
 * These are Fastify logger *options*, not a constructed instance: passing an instance pins the
 * server's logger type to a concrete pino type and makes every `FastifyInstance` in the codebase
 * incompatible with the default one. Handing Fastify the options lets it build the logger, and
 * `server.log` is then the single logger everything else uses.
 */
export interface LoggerOptions {
  readonly name: string;
  readonly level: string;
  readonly transport?: { readonly target: string; readonly options: Record<string, unknown> };
}

export function createLoggerOptions(name: string, level: string): LoggerOptions {
  // Human-readable in a terminal, JSON when something is collecting it.
  if (!process.stdout.isTTY) {
    return { name, level };
  }

  return {
    name,
    level,
    transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } },
  };
}
