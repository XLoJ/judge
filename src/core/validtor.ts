import * as path from 'path';
import { promises } from 'fs';

import { Verdict } from '../verdict';
import { makeTempDir, rimraf } from '../utils';

import { Submission } from './submission';
import { SubmissionType } from './type';
import { TestCase } from './testcase';

export class Validator extends Submission {
  constructor(name: string, basePath: string, lang: string) {
    super(lang, SubmissionType.VAL, {
      file: name,
      dir: basePath
    });
  }

  async clear(): Promise<void> {}

  async validate(testcase: TestCase) {
    const runDir = await makeTempDir();
    const valDir = await makeTempDir();
    const valErr = path.join(valDir, 'val.err');

    try {
      // Run in 15s and 1024MB
      const result = await this.run({
        workDir: runDir,
        fileBindings: [
          {
            mode: '-R',
            src: this.fullFilePath,
            dst: this.execute.file
          }
        ],
        maxTime: 15,
        maxMemory: 1024,
        stdinFile: testcase.inputFile,
        stderrFile: valErr,
        trusted: true
      });
      if (result.verdict === Verdict.Accepted) {
        return result;
      } else {
        result.message = (await promises.readFile(valErr, 'utf8')).trim();
        return result;
      }
    } finally {
      await rimraf(runDir);
      await rimraf(valDir);
    }
  }
}
