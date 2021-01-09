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
      PREFETCH: number;
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
      required: [
        'SERVER_NAME',
        'PORT',
        'HOST',
        'USERNAME',
        'PASSWORD',
        'PREFETCH'
      ],
      properties: {
        SERVER_NAME: { type: 'string' },
        PORT: { type: 'string', default: '3000' },
        HOST: { type: 'string', default: '127.0.0.1' },
        USERNAME: { type: 'string' },
        PASSWORD: { type: 'string' },
        RMQ_HOST: { type: 'string' },
        RMQ_PORT: { type: 'number' },
        RMQ_USER: { type: 'string' },
        RMQ_PASS: { type: 'string' },
        PREFETCH: { type: 'number', default: 1 }
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

      app.amqpChannel.prefetch(app.config.PREFETCH);

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

  await app.addHook(
    'preSerialization',
    async (request, reply, payload: string | Record<string, any>) => {
      if (typeof payload === 'string') {
        return payload;
      } else {
        const newPayload = payload;
        newPayload.reqId = request.id;
        newPayload.timestamp = new Date().toISOString();
        newPayload.from = app.config.SERVER_NAME;
        return newPayload;
      }
    }
  );

  app.get('/', async () => {
    return {};
  });

  await app.listen(app.config.PORT, app.config.HOST);
}

bootstrap();
