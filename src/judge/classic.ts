import { Judger } from './judger';

export class ClassicJudger extends Judger {
  static readonly TYPE = 'Classic';

  constructor() {
    super(ClassicJudger.TYPE);
  }

  judge(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
