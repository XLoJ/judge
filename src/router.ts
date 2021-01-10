import { FastifyInstance, FastifyRequest } from 'fastify';

import {
  JudgeSubmissionDTO,
  JudgeSubmissionSchema,
  ResultMessage
} from './judge/type';
import { getJudger } from './judge';

async function judge(body: JudgeSubmissionDTO, type?: string) {
  const judger = getJudger(type);
  const records: ResultMessage[] = [];
  await judger.judge((msg) => {
    records.push(msg);
  }, body);
  return { id: body.id, records };
}

export function registerRouter(app: FastifyInstance) {
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
      return judge(request.body, request.params.type);
    }
  );
}
