import * as path from 'path';

import hyperid from 'hyperid';
import fastify from 'fastify';
import fastifyEnv from 'fastify-env';
import fastifyAmqp from 'fastify-amqp';

import { isDef } from './utils';

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: string;
      HOST: string;
      SERVER_NAME: string;
      USERNAME: string;
      PASSWORD: string;

      RMQ_HOST?: string;
      RMQ_PORT?: number;
      RMQ_USER?: string;
      RMQ_PASS?: string;
    };
  }
}

async function bootstrap() {
  const app = fastify({
    bodyLimit: 16 * 1024 * 1024, // 16 MB
    logger: {
      prettyPrint: true
    },
    genReqId() {
      const instance = hyperid({ urlSafe: true });
      return instance.uuid;
    }
  });

  await app.register(fastifyEnv, {
    dotenv: {
      path: path.join(__dirname, '../.env')
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
        RMQ_HOST: { type: 'string' },
        RMQ_PORT: { type: 'number' },
        RMQ_USER: { type: 'string' },
        RMQ_PASS: { type: 'string' }
      }
    }
  });

  if (isDef(app.config.RMQ_HOST)) {
    try {
      await app.register(fastifyAmqp, {
        host: app.config.RMQ_HOST,
        port: app.config.RMQ_PORT,
        user: app.config.RMQ_USER,
        pass: app.config.RMQ_PASS
      });
      app.log.info(
        `Connect to Rabbit MQ at amqp://${app.config.RMQ_HOST}:${
          app.config.RMQ_PORT ?? 5672
        }`
      );
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  }

  app.get('/', async () => {
    return `This is XLoJ Judge Server from "${app.config.SERVER_NAME}".`;
  });

  await app.listen(app.config.PORT, app.config.HOST);
}

bootstrap();
