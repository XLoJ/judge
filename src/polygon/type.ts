export enum ActionType {
  START = 'start',
  DOWNLOAD = 'download',
  COMPILE = 'compile',
  COMPILE_ERROR = 'compile_error',
  END = 'end',
  ERROR = 'error'
}

type PolygonMessage = {
  action: ActionType;
  message?: string;
  name?: string;
};

export type NotifyFn = (message: PolygonMessage) => Promise<void> | void;

export interface IBuildCode {
  id: number;
  name: string;
  language: string;
  type: string;
  version: number;
  fullname: string;
}

export type TestcaseConfig =
  | {
      type: 'file';
      filename: string;
    }
  | {
      type: 'generator';
      generator: number;
      args: string[];
    };

export interface IBuildTask {
  problem: string;

  version: number;

  timeLimit: number;

  memoryLimit: number;

  testcases: TestcaseConfig[];

  staticFiles: string[];

  checker: IBuildCode;

  validator: IBuildCode;

  solution: IBuildCode;

  generators: IBuildCode[];
}
