import { FastifyInstance } from 'fastify';
import { Message } from 'amqplib';

import { isDef } from '../utils';

import { ActionType, IBuildTask, NotifyFn } from './type';
import { build } from './build';

export function registerPolygonRouter(app: FastifyInstance) {
  if (isDef(app.amqpChannel)) {
    app.amqpChannel.consume(
      app.config.POLYGON_QUEUE,
      async (msg: Message | null) => {
        if (!isDef(msg)) return;

        const body = JSON.parse(msg.content.toString()) as IBuildTask;
        body.testcases = JSON.parse((body.testcases as unknown) as string);

        app.log.info(`Handle Rabbit MQ message: Polygon "${body.problem}"`);

        // Current message index
        let index = 0;
        const send: NotifyFn = (msg) => {
          const response = {
            index: ++index,
            problem: body.problem,
            version: body.version,
            from: app.config.SERVER_NAME,
            timestamp: new Date().toISOString(),
            ...msg
          };
          const buffer = Buffer.from(JSON.stringify(response));
          app.amqpChannel.sendToQueue(app.config.POLYGON_MSG_QUEUE, buffer);
        };

        try {
          await build(body, send);
        } catch (err) {
          // send Error message
          app.log.error(err);
          send({
            action: ActionType.ERROR,
            message: err.message ?? 'Unknown Error'
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
