import { loadDeliveryEnv } from './env';
import { buildServer } from './server';

const env = loadDeliveryEnv();
const { server } = await buildServer(env);

await server.listen({ host: env.HOST, port: env.PORT });
