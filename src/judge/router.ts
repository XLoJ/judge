import { FastifyInstance, FastifyRequest } from 'fastify';

import {
  JudgeSubmissionDTO,
  JudgeSubmissionSchema,
  NotifyFn,
  ResultMessage
} from './type';

import { ClassicJudge } from './classic';
import { isDef } from '../utils';
import { Verdict } from '../verdict';

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

  if (isDef(app.amqpChannel)) {
    app.amqpChannel.consume(
      app.config.JUDGE_QUEUE,
      async (msg) => {
        if (!isDef(msg)) return;

        const body = JSON.parse(msg.content.toString());

        app.log.info(`Handle Rabbit MQ message: Judge "${body.id}"`);

        const classicJudge = new ClassicJudge();

        let index = 0;
        const send: NotifyFn = (msg) => {
          const response = {
            index: ++index,
            from: app.config.SERVER_NAME,
            timestamp: new Date().toISOString(),
            id: body.id,
            ...msg
          };
          const buffer = Buffer.from(JSON.stringify(response));
          app.amqpChannel.sendToQueue(app.config.MSG_QUEUE, buffer);
        };

        try {
          await classicJudge.judge(send, body);
        } catch (err) {
          // send error message
          send({
            verdict: Verdict.SystemError,
            message: err.message
          });
        }

        app.amqpChannel.ack(msg);
      },
      {
        noAck: false
      }
    );
  }
}
