export abstract class Judger {
  public readonly type: string;

  protected constructor(type: string) {
    this.type = type;
  }

  public abstract judge(): Promise<void>;
}
