import { FastifyInstance } from 'fastify';
import { JudgeSubmissionSchema, SubmissionInfoSchema } from './judge/type';

export function registerSchema(app: FastifyInstance) {
  app.addSchema(SubmissionInfoSchema);
  app.addSchema(JudgeSubmissionSchema);
}
