import { Problem } from '../core/problem';
import { getLogger } from '../logger';

import { ActionType, IBuildTask, NotifyFn, TestcaseConfig } from './type';
import { CompileError } from '../error';

const logger = getLogger();

export async function build(buildTask: IBuildTask, fn: NotifyFn) {
  fn({ action: ActionType.START });

  const problem = new Problem(buildTask.problem);

  await problem.ensureProblem();
  await problem.ensureTestcasesBasePath(buildTask.version);

  try {
    fn({ action: ActionType.COMPILE, name: buildTask.checker.fullname });
    await problem.ensureChecker(
      buildTask.checker.fullname,
      buildTask.checker.language
    );

    fn({ action: ActionType.COMPILE, name: buildTask.validator.fullname });
    await problem.ensureValidator(
      buildTask.validator.fullname,
      buildTask.validator.language
    );

    fn({ action: ActionType.COMPILE, name: buildTask.solution.fullname });
    await problem.ensureGenerator(
      buildTask.solution.fullname,
      buildTask.solution.language
    );

    for (const generator of buildTask.generators) {
      fn({ action: ActionType.COMPILE, name: generator.fullname });
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

  for (let i = 0; i < buildTask.testcases.length; i++) {
    const testcase = buildTask.testcases[i];
    if (testcase.type === 'file') {
      const filename = testcase.filename;
    } else if (testcase.type === 'generator') {
    } else {
      throw new Error(
        `Unexpected testcase type ${
          (testcase as TestcaseConfig).type
        } at ${i}-th testcase`
      );
    }
  }

  fn({ action: ActionType.END });
}
