import { promises, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

import { Verdict } from '../../verdict';
import { randomString, rimraf } from '../../utils';

import { Problem } from '../problem';

function readCode(file: string) {
  return readFileSync(
    path.join(__dirname, `../../../test/assets/aplusb/${file}`),
    'utf8'
  );
}

jest.setTimeout(20 * 1000);

describe('Test Val', () => {
  const problem = new Problem(1, 'aplusb');
  const validator = problem.validator('val', 'cpp');

  beforeAll(async () => {
    await rimraf(validator.fullFilePath);
    await validator.compile(readCode('val.cpp'));
  });

  test('Correct 1', async () => {
    const testcase = problem.testcase(1, '1');
    const result = await validator.validate(testcase);
    expect(result.verdict).toBe(Verdict.Accepted);
  });

  test('Correct 2', async () => {
    const testcase = problem.testcase(1, '2');
    const result = await validator.validate(testcase);
    expect(result.verdict).toBe(Verdict.Accepted);
  });

  test('Correct 3', async () => {
    const testcase = problem.testcase(1, '3');
    const result = await validator.validate(testcase);
    expect(result.verdict).toBe(Verdict.Accepted);
  });

  test('Correct 4', async () => {
    const testcase = problem.testcase(1, '4');
    const result = await validator.validate(testcase);
    expect(result.verdict).toBe(Verdict.Accepted);
  });

  test('Correct 5', async () => {
    const testcase = problem.testcase(1, '5');
    const result = await validator.validate(testcase);
    expect(result.verdict).toBe(Verdict.Accepted);
  });

  test('Fail', async () => {
    const id = randomString(8);
    const aplusbWrong = problem.testcase(1, id);
    writeFileSync(aplusbWrong.inputFile, 'xysj txdy', 'utf8');

    const result = await validator.validate(aplusbWrong);
    expect(result.verdict).not.toBe(Verdict.Accepted);
    expect(result.message).toBe(
      'FAIL Expected integer, but "xysj" found (stdin, line 1)'
    );
    await aplusbWrong.clear();
  });
});
