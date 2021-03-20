import * as path from 'path';
import { readFileSync } from 'fs';

import { Verdict } from '../../verdict';
import { Submission } from '../submission';
import { Checker } from '../checker';
import { Runner } from '../runner';
import { TestCase } from '../testcase';
import { Problem } from '../problem';

jest.setTimeout(10 * 1000);

function readCode(file: string) {
  return readFileSync(
    path.join(__dirname, `../../../test/assets/aplusb/${file}`),
    'utf8'
  );
}

describe('Test aplusb', () => {
  let submission: Submission;
  let checker: Checker;
  let runner: Runner;
  let testcase: TestCase;

  beforeAll(async () => {
    submission = new Submission('cpp');
    const problem = new Problem(1, 'aplusb');
    checker = problem.checker(1, 'chk', 'cpp');
    runner = new Runner(submission, checker, 1, 64);
    testcase = problem.testcase(1, '1');

    const checkerCode = readCode('chk.cpp');
    await checker.compile(checkerCode);
  });

  afterEach(async () => {
    await submission.clear();
  });

  afterAll(async () => {
    await runner.clear();
  });

  test('Run ac', async () => {
    await submission.compile(readCode('ac.cpp'));

    const result = await runner.run(testcase, { returnReport: true });

    expect(result.verdict).toBe(Verdict.Accepted);
    if ('stdout' in result) {
      expect(result.stdout).toBe('2');
      expect(result.checkerOut).toBe(`answer is '2'`);
    } else {
      expect.assertions(0);
    }
  });

  test('Run wa', async () => {
    await submission.compile(readCode('wa.cpp'));

    const result = await runner.run(testcase, { returnReport: true });

    expect(result.verdict).toBe(Verdict.WrongAnswer);
  });

  test('Run RE', async () => {
    await submission.compile(readCode('re.cpp'));

    const result = await runner.run(testcase, { returnReport: true });

    expect(result.verdict).toBe(Verdict.RuntimeError);
  });

  test('Run MLE', async () => {
    await submission.compile(readCode('mle.cpp'));

    const result = await runner.run(testcase, { returnReport: true });

    expect(result.verdict).toBe(Verdict.MemoryLimitExceeded);
  });

  test('Run TLE', async () => {
    await submission.compile(readCode('tle.cpp'));

    const result = await runner.run(testcase, { returnReport: true });

    // Some environments may not support getting user time, and it will return IdlenessLimitExceeded.
    expect(
      result.verdict === Verdict.IdlenessLimitExceeded ||
        result.verdict === Verdict.TimeLimitExceeded
    ).toBeTruthy();
  });
});
