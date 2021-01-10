import { FastifyInstance, FastifyRequest } from 'fastify';

import { JudgeSubmissionDTO, JudgeSubmissionSchema } from './judge/type';
import { getJudger } from './judge';

export function registerRouter(app: FastifyInstance) {
  app.post(
    '/judge',
    {
      schema: {
        body: JudgeSubmissionSchema
      }
    },
    async (request: FastifyRequest<{ Body: JudgeSubmissionDTO }>) => {
      const judger = getJudger();
      await judger.judge();
      return { id: request.body.id };
    }
  );

  app.post(
    '/judge/:type',
    {
      schema: {
        body: JudgeSubmissionSchema
      }
    },
    async (
      request: FastifyRequest<{
        Body: JudgeSubmissionDTO;
        Params: { type: string };
      }>
    ) => {
      const judger = getJudger();
      await judger.judge();
      return { id: request.body.id, type: request.params.type };
    }
  );
}
