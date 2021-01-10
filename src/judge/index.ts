import { isDef } from '../utils';

import { ClassicJudger } from './classic';
import { Judger } from './judger';

const AcceptJudgers: Record<string, new () => Judger> = {
  [ClassicJudger.TYPE]: ClassicJudger
};

export function getJudger(type?: string): Judger {
  if (isDef(type)) {
    const acceptJudger = AcceptJudgers[type];
    if (isDef(acceptJudger)) {
      return new acceptJudger();
    } else {
      throw new Error(`Can not find judger "${type}"`);
    }
  } else {
    return new ClassicJudger();
  }
}
