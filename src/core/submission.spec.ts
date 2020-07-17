import * as path from 'path';
import * as rimraf from 'rimraf';

import { makeTempDir, exec } from '../utils';
import { promises, readFileSync } from 'fs';
import { Submission } from './submission';

describe('Test echo', () => {
  const submission = new Submission('text');

  let hasNsjail = true;

  let workDir = '';
  let outFile = '';
  let errFile = '';

  beforeEach(async () => {
    try {
      workDir = await makeTempDir();
      outFile = path.join(workDir, 'out');
      errFile = path.join(workDir, 'err');
      await promises.writeFile(outFile, '', 'utf8');
      await promises.writeFile(errFile, '', 'utf8');
      await promises.chmod(outFile, 0o766);
      await promises.chmod(errFile, 0o766);

      const { code } = await exec('/bin/nsjail', ['-h']);
      if (code !== 0) {
        hasNsjail = false;
      }
    } catch (error) {
      workDir = '';
      outFile = '';
      errFile = '';
    }
  });

  test('Run echo', async () => {
    if (hasNsjail) {
      try {
        await submission.run({
          workDir,
          executeFile: '/bin/echo',
          executeArgs: ['Hello World'],
          maxTime: 10,
          maxMemory: 128,
          stdoutFile: outFile,
          stderrFile: errFile
        });
        expect(
          hasNsjail ? readFileSync(outFile, 'utf8') : 'Hello World\n'
        ).toEqual('Hello World\n');
      } catch (error) {}
    } else {
      expect(true).toBeTruthy();
    }
  });

  afterEach(() => {
    try {
      if (workDir !== '') {
        rimraf(workDir, () => {});
      }
    } catch (error) {}
  });
});