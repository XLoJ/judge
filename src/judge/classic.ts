import { b64decode } from '../utils';
import { Verdict } from '../verdict';
import { getLogger } from '../logger';
import { CompileError } from '../error';
import { Submission } from '../core';
import { Runner } from '../core/runner';
import { Problem } from '../core/problem';

import { JudgeSubmissionDTO, JudgingMessage, NotifyFn } from './type';

interface JudgeOptions {
  returnReport?: boolean;
  isTestAllCases?: boolean;
}

const logger = getLogger();

export class ClassicJudge {
  static readonly TYPE = 'Classic';

  async judge(
    notify: NotifyFn,
    {
      maxTime,
      maxMemory,
      problem: problemInfo,
      code: b64Code,
      lang,
      cases,
      casesVersion
    }: JudgeSubmissionDTO,
    { returnReport = true, isTestAllCases = false }: JudgeOptions = {}
  ): Promise<void> {
    const code = b64decode(b64Code);
    const submission = new Submission(lang);
    const problem = new Problem(problemInfo.name);

    // Compile
    await notify({ verdict: Verdict.Compiling });

    try {
      await submission.compile(code, Math.max(maxTime * 5, 15));
    } catch (err) {
      const exceptionInfo = CompileError.toHttpException(err);
      await notify(exceptionInfo);
      return;
    }

    await problem.ensureTestcasesBasePath(casesVersion);
    await problem.ensureChecker(
      problemInfo.checker.name,
      problemInfo.checker.lang
    );

    const checker = problem.checker(
      problemInfo.checker.name,
      problemInfo.checker.lang
    );
    const runner = new Runner(submission, checker, maxTime, maxMemory);

    let pass = 0;
    for (const testcaseId of cases) {
      const testcase = problem.testcase(casesVersion, testcaseId);

      try {
        await testcase.ensure(problem.minioTestcasesBasePath(casesVersion));

        const result = await runner.run(testcase, { returnReport });

        if (result.verdict === Verdict.Accepted) pass++;

        const message: JudgingMessage = {
          testcaseId,
          verdict: result.verdict,
          time: result.time,
          memory: result.memory,
          pass
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
          logger.error(
            `Can not find testcase "${testcaseId}"\n input -> ${testcase.inputFile}\n answer -> ${testcase.answerFile}`
          );
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

    notify({ verdict: Verdict.Finished, pass });

    await runner.clear();
  }
}
