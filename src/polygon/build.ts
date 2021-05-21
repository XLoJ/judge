import { ActionType, IBuildTask, NotifyFn } from './type';

export async function build(buildTask: IBuildTask, fn: NotifyFn) {
  fn({ action: ActionType.START });

  fn({ action: ActionType.END });
}
