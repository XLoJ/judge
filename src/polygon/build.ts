import path from 'path';

import { Problem } from '../core/problem';
import { getLogger } from '../logger';
import { CompileError } from '../error';
import { isDef } from '../utils';
import { Verdict } from '../verdict';

import { ActionType, IBuildTask, NotifyFn, TestcaseConfig } from './type';

const logger = getLogger();

export async function build(buildTask: IBuildTask, fn: NotifyFn) {
  fn({ action: ActionType.START });

  const problem = new Problem(buildTask.problem);

  await problem.ensureProblem();
  await problem.ensureTestcasesBasePath(buildTask.version);

  try {
    fn({
      action: ActionType.COMPILE,
      name: buildTask.checker.fullname,
      code: buildTask.checker
    });
    await problem.ensureChecker(
      buildTask.checker.fullname,
      buildTask.checker.language
    );

    fn({
      action: ActionType.COMPILE,
      name: buildTask.validator.fullname,
      code: buildTask.validator
    });
    await problem.ensureValidator(
      buildTask.validator.fullname,
      buildTask.validator.language
    );

    fn({
      action: ActionType.COMPILE,
      name: buildTask.solution.fullname,
      code: buildTask.solution
    });
    await problem.ensureGenerator(
      buildTask.solution.fullname,
      buildTask.solution.language
    );

    for (const generator of buildTask.generators) {
      fn({
        action: ActionType.COMPILE,
        name: generator.fullname,
        code: generator
      });
      await problem.ensureGenerator(generator.fullname, generator.language);
    }
  } catch (err) {
    if (err instanceof CompileError) {
      fn({ action: ActionType.COMPILE_ERROR, message: err.message });
      return;
    } else {
      throw err;
    }
  }

  const validator = problem.validator(
    buildTask.validator.fullname,
    buildTask.validator.language
  );

  const solution = problem.generator(
    buildTask.solution.fullname,
    buildTask.solution.language
  );

  for (let i = 0; i < buildTask.testcases.length; i++) {
    const testcaseConfig = buildTask.testcases[i];
    const sendTestcaseConfig = { index: i + 1, ...testcaseConfig };
    const testcase = problem.testcase(buildTask.version, String(i + 1));

    // Download static file testcase, or generate input
    if (testcaseConfig.type === 'file') {
      fn({ action: ActionType.DOWNLOAD, testcase: sendTestcaseConfig });

      // Use static folder here
      const fullFilename = path.join(
        buildTask.problem,
        'static',
        testcaseConfig.filename
      );

      await testcase.downloadIn(fullFilename);
    } else if (testcaseConfig.type === 'generator') {
      const findGenerator = buildTask.generators.find(
        (generator) => generator.id === testcaseConfig.generator
      );
      if (isDef(findGenerator)) {
        fn({
          action: ActionType.GEN_IN,
          testcase: sendTestcaseConfig,
          code: findGenerator
        });

        const generator = problem.generator(
          findGenerator.fullname,
          findGenerator.language
        );
        const result = await testcase.genIn(generator, testcaseConfig.args);

        // generate fail
        if (result.verdict !== Verdict.Accepted) {
          logger.error(result);
          fn({
            action: ActionType.ERROR,
            message: JSON.stringify(result),
            testcase: sendTestcaseConfig
          });
          return;
        }
      } else {
        throw new Error(
          `Unexpected generator ${testcaseConfig.generator} at ${i}-th testcase`
        );
      }
    } else {
      throw new Error(
        `Unexpected testcase type ${
          (testcaseConfig as TestcaseConfig).type
        } at ${i}-th testcase`
      );
    }

    // Validate
    {
      fn({
        action: ActionType.VALIDATE,
        testcase: sendTestcaseConfig,
        code: buildTask.validator
      });

      const result = await validator.validate(testcase);

      if (result.verdict !== Verdict.Accepted) {
        logger.error(result);
        fn({
          action: ActionType.ERROR,
          message: JSON.stringify(result),
          testcase: sendTestcaseConfig
        });
        return;
      }
    }

    // Generate ans
    {
      fn({
        action: ActionType.GEN_ANS,
        testcase: sendTestcaseConfig,
        code: buildTask.solution
      });

      const result = await testcase.genAns(solution);

      if (result.verdict !== Verdict.Accepted) {
        logger.error(result);
        fn({
          action: ActionType.ERROR,
          message: JSON.stringify(result),
          testcase: sendTestcaseConfig
        });
        return;
      }
    }

    // Upload in and ans
    {
      fn({
        action: ActionType.UPLOAD,
        testcase: sendTestcaseConfig
      });

      const folder = problem.minioTestcasesBasePath(buildTask.version);
      await testcase.uploadToMinio(folder);
    }
  }

  fn({ action: ActionType.END });
}
