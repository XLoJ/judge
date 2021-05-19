import { FastifyInstance, FastifyRequest } from 'fastify';

import {
  JudgeSubmissionDTO,
  JudgeSubmissionSchema,
  ResultMessage
} from './type';

import { ClassicJudge } from './classic';
import { isDef } from '../utils';

async function judge(body: JudgeSubmissionDTO) {
  const classicJudge = new ClassicJudge();
  const records: Array<ResultMessage & { timestamp: string }> = [];
  await classicJudge.judge((msg) => {
    records.push({
      timestamp: new Date().toISOString(),
      ...msg
    });
  }, body);
  return { id: body.id, records };
}

export function registerJudgeRouter(app: FastifyInstance) {
  app.post(
    '/judge',
    {
      schema: {
        body: JudgeSubmissionSchema
      }
    },
    async (request: FastifyRequest<{ Body: JudgeSubmissionDTO }>) => {
      return judge(request.body);
    }
  );

  app.amqpChannel.consume(
    app.config.JUDGE_QUEUE,
    async (msg) => {
      if (!isDef(msg)) return;

      const body = JSON.parse(msg.content.toString());

      app.log.info(`Handle Rabbit MQ message: Judge "${body.id}"`);

      const classicJudge = new ClassicJudge();
      await classicJudge.judge((msg) => {
        const response = {
          from: app.config.SERVER_NAME,
          timestamp: new Date().toISOString(),
          ...msg
        };
        const buffer = Buffer.from(JSON.stringify(response));
        app.amqpChannel.sendToQueue(app.config.MSG_QUEUE, buffer);
      }, body);

      app.amqpChannel.ack(msg);
    },
    {
      noAck: false
    }
  );
}
