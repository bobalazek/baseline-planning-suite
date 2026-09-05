import { loadPeopleEnv } from './env';
import { buildServer } from './server';

const env = loadPeopleEnv();
const { server } = await buildServer(env);

await server.listen({ host: env.HOST, port: env.PORT });
