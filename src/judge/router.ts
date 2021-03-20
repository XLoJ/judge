import { FastifyInstance, FastifyRequest } from 'fastify';

import {
  JudgeSubmissionDTO,
  JudgeSubmissionSchema,
  ResultMessage
} from './type';

import { ClassicJudge } from './classic';

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
}
