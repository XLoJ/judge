import { Submission } from './submission';
import { SubmissionType } from './type';

export class Generator extends Submission {
  constructor(name: string, basePath: string, lang: string) {
    super(lang, SubmissionType.GEN, {
      file: name,
      dir: basePath
    });
  }
}
