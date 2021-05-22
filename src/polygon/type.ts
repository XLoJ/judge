export enum ActionType {
  START = 'start',
  COMPILE = 'compile',
  COMPILE_ERROR = 'compile_error',
  DOWNLOAD = 'download',
  GEN_IN = 'gen_in',
  VALIDATE = 'validate',
  GEN_ANS = 'gen_ans',
  UPLOAD = 'upload',
  EXAMPLE = 'example',
  END = 'end',
  ERROR = 'error'
}

type PolygonMessage = {
  action: ActionType;
  message?: string;
  name?: string;
  code?: IBuildCode;
  testcase?: TestcaseConfig & { index: number };
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
      example?: boolean;
    }
  | {
      type: 'generator';
      generator: number;
      args: string[];
      example?: boolean;
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
