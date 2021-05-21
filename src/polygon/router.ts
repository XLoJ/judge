import { FastifyInstance } from 'fastify';
import { Message } from 'amqplib';

import { isDef } from '../utils';

import { IBuildTask } from './type';

export function registerPolygonRouter(app: FastifyInstance) {
  if (isDef(app.amqpChannel)) {
    app.amqpChannel.consume(
      app.config.POLYGON_QUEUE,
      async (msg: Message | null) => {
        if (!isDef(msg)) return;

        const body = JSON.parse(msg.content.toString()) as IBuildTask;

        app.log.info(`Handle Rabbit MQ message: Polygon "${body.problem}"`);

        const ack = () => app.amqpChannel.ack(msg);
        const nack = () => app.amqpChannel.nack(msg);
        const send = (msg: any) => {
          const response = {
            from: app.config.SERVER_NAME,
            timestamp: new Date().toISOString(),
            ...msg
          };
          const buffer = Buffer.from(JSON.stringify(response));
          app.amqpChannel.sendToQueue(app.config.POLYGON_MSG_QUEUE, buffer);
        };
      },
      {
        noAck: false
      }
    );
  }
}
