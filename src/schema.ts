import { FastifyInstance } from 'fastify';
import {
  JudgeSubmissionSchema,
  CodeInfoSchema,
  JudgeProblemInfoSchema
} from './judge/type';

export function registerSchema(app: FastifyInstance) {
  app.addSchema(CodeInfoSchema);
  app.addSchema(JudgeProblemInfoSchema);
  app.addSchema(JudgeSubmissionSchema);
}
