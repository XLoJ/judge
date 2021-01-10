import { b64decode } from '../utils';
import { Verdict } from '../verdict';
import { Checker, CompileError, Submission } from '../core';

import { Judger } from './judger';
import { JudgeSubmissionDTO, JudgingMessage, NotifyFn } from './type';
import { Runner } from '../core/runner';
import { getLogger } from '../logger';

const logger = getLogger();

export class ClassicJudger extends Judger {
  static readonly TYPE = 'Classic';

  constructor() {
    super(ClassicJudger.TYPE);
  }

  async judge(
    notify: NotifyFn,
    {
      maxTime,
      maxMemory,
      checker: checkerInfo,
      code: b64Code,
      lang,
      cases,
      returnReport,
      isTestAllCases
    }: JudgeSubmissionDTO
  ): Promise<void> {
    const code = b64decode(b64Code);
    const submission = new Submission(lang);

    // Compile
    await notify({ verdict: Verdict.Compiling });

    try {
      await submission.compile(code, Math.max(maxTime * 5, 15));
    } catch (err) {
      const exceptionInfo = CompileError.toHttpException(err);
      await notify(exceptionInfo);
      return;
    }

    const checker = new Checker(checkerInfo.id, checkerInfo.lang);
    const runner = new Runner(submission, checker, maxTime, maxMemory);

    for (const testcaseId of cases) {
      try {
        const result = await runner.run(testcaseId, { returnReport });

        const message: JudgingMessage = {
          testcaseId,
          verdict: result.verdict,
          time: result.time,
          memory: result.memory
        };

        if (returnReport) {
          if ('stdout' in result) {
            message.stdout = result.stdout;
          }
          if ('checkerOut' in result) {
            message.checkerOut = result.checkerOut;
          }
        }

        await notify(message);

        if (!isTestAllCases && result.verdict !== Verdict.Accepted) {
          break;
        }
      } catch (error) {
        // TODO: handle system error, testcase error ans so on
        if (error.verdict === Verdict.TestCaseError) {
          const message = `Can not find testcase "${testcaseId}"`;
          logger.error(message);
          await notify({
            verdict: Verdict.TestCaseError,
            message: `Can not find testcase "${testcaseId}"`
          });
        } else {
          logger.error(`${error}`);
          await notify({
            verdict: Verdict.SystemError,
            message: 'Unknown'
          });
        }
        break;
      }
    }

    await runner.clear();
  }
}
