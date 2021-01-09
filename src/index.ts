import * as path from 'path';

import fastify from 'fastify';
import fastifyEnv from 'fastify-env';
import hyperid from 'hyperid';

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: string;
      HOST: string;
      SERVER_NAME: string;
      USERNAME: string;
      PASSWORD: string;
    };
  }
}

async function bootstrap() {
  const server = fastify({
    bodyLimit: 16 * 1024 * 1024, // 16 MB
    logger: {
      prettyPrint: true,
    },
    genReqId(req) {
      const instance = hyperid({ urlSafe: true });
      return instance.uuid;
    },
  });

  await server.register(fastifyEnv, {
    dotenv: {
      path: path.join(__dirname, '../.env'),
    },
    schema: {
      type: 'object',
      required: ['SERVER_NAME', 'PORT', 'HOST', 'USERNAME', 'PASSWORD'],
      properties: {
        SERVER_NAME: { type: 'string' },
        PORT: { type: 'string', default: '3000' },
        HOST: { type: 'string', default: '127.0.0.1' },
        USERNAME: { type: 'string' },
        PASSWORD: { type: 'string' },
      },
    },
  });

  await server.listen(server.config.PORT, server.config.HOST);
}

bootstrap();
