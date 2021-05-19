import * as path from 'path';

import hyperid from 'hyperid';
import fastify from 'fastify';
import fastifyEnv from 'fastify-env';
import fastifyAmqp from 'fastify-amqp';
import { Client } from 'minio';

import { isDef } from './utils';
import { getLogger } from './logger';
import { registerSchema } from './schema';
import { registerJudgeRouter } from './judge/router';
import { registerPolygonRouter } from './polygon/router';
import { initMinio } from './minio';

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: string;
      HOST: string;
      SERVER_NAME: string;
      USERNAME: string;
      PASSWORD: string;

      JUDGE_QUEUE: string;
      POLYGON_QUEUE: string;
      MSG_QUEUE: string;

      RMQ_HOST?: string;
      RMQ_PORT?: number;
      RMQ_USER?: string;
      RMQ_PASS?: string;
      PREFETCH: number;

      MINIO_HOST?: string;
      MINIO_PORT?: number;
      MINIO_ACCESS?: string;
      MINIO_SECRET?: string;
    };
  }
}

export async function build() {
  const app = fastify({
    bodyLimit: 16 * 1024 * 1024, // 16 MB
    logger: getLogger(),
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
        JUDGE_QUEUE: { type: 'string', default: 'Judge' },
        POLYGON_QUEUE: { type: 'string', default: 'Polygon' },
        MSG_QUEUE: { type: 'string', default: 'JudgeMessage' },
        RMQ_HOST: { type: 'string' },
        RMQ_PORT: { type: 'number' },
        RMQ_USER: { type: 'string' },
        RMQ_PASS: { type: 'string' },
        PREFETCH: { type: 'number', default: 1 },
        MINIO_HOST: { type: 'string' },
        MINIO_PORT: { type: 'number' },
        MINIO_ACCESS: { type: 'string' },
        MINIO_SECRET: { type: 'string' }
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

      app.amqpChannel.assertQueue(app.config.JUDGE_QUEUE);
      app.amqpChannel.assertQueue(app.config.POLYGON_QUEUE);
      app.amqpChannel.assertQueue(app.config.MSG_QUEUE);

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

  if (isDef(app.config.MINIO_HOST)) {
    const client = new Client({
      endPoint: app.config.MINIO_HOST,
      port: app.config.MINIO_PORT,
      useSSL: false,
      accessKey: app.config.MINIO_ACCESS!,
      secretKey: app.config.MINIO_SECRET!
    });
    initMinio(client);
    app.log.info(
      `Connect to Min IO at http://${app.config.MINIO_HOST}:${
        app.config.MINIO_PORT ?? 9000
      }`
    );
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

  registerSchema(app);

  registerJudgeRouter(app);

  registerPolygonRouter(app);

  return app;
}
