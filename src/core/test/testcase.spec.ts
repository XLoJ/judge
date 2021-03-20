import { readFileSync } from 'fs';
import * as path from 'path';

import { randomString, rimraf } from '../../utils';
import { Verdict } from '../../verdict';
import { Problem } from '../problem';

function readCode(file: string) {
  return readFileSync(
    path.join(__dirname, `../../../test/assets/aplusb/${file}`),
    'utf8'
  );
}

jest.setTimeout(30 * 1000);

describe('Testcase', () => {
  const problem = new Problem(2, 'aplusb');
  const generatorIn = problem.generator('gen', 'cpp');
  const generatorAns = problem.generator('std', 'cpp');
  const testcase = problem.testcase(1, randomString(8));

  beforeAll(async () => {
    await problem.ensureTestcasesBasePath(1);

    await generatorIn.compile(readCode('gen.cpp'));
    await generatorAns.compile(readCode('ac.cpp'));
  });

  test('Gen', async () => {
    const a = Math.floor(Math.random() * 100);
    const b = Math.floor(Math.random() * 100);

    const resultIn = await testcase.genIn(generatorIn, [String(a), String(b)]);
    expect(resultIn.verdict).toBe(Verdict.Accepted);
    expect(readFileSync(testcase.inputFile, 'utf8').trim()).toMatch(
      `${a} ${b}`
    );

    const resultAns = await testcase.genAns(generatorAns);
    expect(resultAns.verdict).toBe(Verdict.Accepted);
    expect(readFileSync(testcase.answerFile, 'utf8').trim()).toMatch(
      `${a + b}`
    );
  });

  afterAll(async () => {
    await rimraf(problem.localBasePath);
  });
});
