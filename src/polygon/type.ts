export interface IBuildCode {}

export interface IBuildTask {
  problem: string;

  version: number;

  timeLimit: number;

  memoryLimit: number;

  testcases: string;

  staticFiles: string[];

  checker: IBuildCode;

  validator: IBuildCode;

  solution: IBuildCode;

  generators: IBuildCode[];
}
