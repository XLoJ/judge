import { Verdict, JudgeVerdict } from '../verdict';

import { Result } from './result';
import { Submission } from './submission';
import { JudgeError } from '../error';
import { SubmissionType } from './type';

export class Checker extends Submission {
  constructor(name: string, basePath: string, lang: string) {
    super(lang, SubmissionType.CHK, {
      file: name,
      dir: basePath
    });
  }

  async clear(): Promise<void> {}

  static getVerdict({ verdict, exitCode }: Result): JudgeVerdict {
    if (verdict !== Verdict.Accepted) {
      if (exitCode === 3) {
        throw new JudgeError('');
      }
      if (exitCode === 7) {
        return Verdict.Point;
      }
      if (verdict !== Verdict.RuntimeError) {
        return verdict;
      }
      return Verdict.WrongAnswer;
    }
    return Verdict.Accepted;
  }
}
