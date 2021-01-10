import { JudgeSubmissionDTO, NotifyFn } from './type';

export abstract class Judger {
  public readonly type: string;

  protected constructor(type: string) {
    this.type = type;
  }

  public abstract judge(
    fn: NotifyFn,
    submissionDTO: JudgeSubmissionDTO
  ): Promise<void>;
}
