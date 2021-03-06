import { Submission } from './submission';
import { Result, ResultWithReport } from './result';
import { Checker } from './checker';
import { TestCase } from './testcase';

export enum ProblemType {
  CLASSIC = 'classic'
}

export enum SubmissionType {
  SUB = 'Submission',
  CHK = 'Checker',
  GEN = 'Generator',
  VAL = 'Validator',
  INT = 'Interactor'
}

export interface IFileBinding {
  src: string;
  dst: string;
  mode: '-R' | '-B';
}

export interface ISubmissionRunParam {
  workDir: string;
  fileBindings?: IFileBinding[];
  trusted?: boolean;

  executeCommand?: string;
  executeArgs?: string[];

  maxTime: number;
  maxMemory: number;

  stdinFile?: string;
  stdoutFile?: string;
  stderrFile?: string;
}

export interface RunOptions {
  returnReport?: boolean;
}

export interface IRunner {
  submission: Submission;
  checker: Checker;
  maxTime: number;
  maxMemory: number;

  run(
    testcase: TestCase,
    runOptions?: RunOptions
  ): Promise<Result | ResultWithReport>;

  clear(): Promise<void>;
}
