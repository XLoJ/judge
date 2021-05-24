import S from 'fluent-json-schema';

import { JudgeVerdict, Verdict } from '../verdict';

export type NotifyFn = (message: ResultMessage) => Promise<void> | void;

export interface JudgeSubmissionDTO {
  id: string;

  maxTime: number; // seconds

  maxMemory: number; // mega bytes

  problem: {
    name: string;

    checker: {
      name: string;

      lang: string;
    };
  };

  casesVersion: number;

  cases: string[];

  lang: string;

  code: string;

  // returnReport: boolean; Query Param
  // isTestAllCases: boolean; Query Param
}

export const CodeInfoSchema = S.object()
  .id('CodeInfo')
  .prop('name', S.string().required())
  .prop('lang', S.string().default('cpp'));

export const JudgeProblemInfoSchema = S.object()
  .id('JudgeProblemInfo')
  .prop('name', S.string().required())
  .prop('checker', S.ref('CodeInfo'));

export const JudgeSubmissionSchema = S.object()
  .id('JudgeSubmission')
  .prop('id', S.string().required())
  .prop('maxTime', S.number().minimum(1).maximum(16).required())
  .prop('maxMemory', S.number().minimum(32).maximum(2048).required())
  .prop('problem', S.ref('JudgeProblemInfo'))
  .prop('casesVersion', S.number().minimum(1).default(1))
  .prop('cases', S.array().items(S.string()).default([]))
  .prop('lang', S.string().default('cpp'))
  .prop('code', S.string().required());

export interface WaitingMessage {
  verdict: Verdict.Waiting;
}

export interface CompilingMessage {
  verdict: Verdict.Compiling;
}

export interface FinishedMessage {
  verdict: Verdict.Finished;
  pass: number;
}

export interface ErrorMessage {
  verdict:
    | Verdict.CompileError
    | Verdict.TestCaseError
    | Verdict.JudgeError
    | Verdict.SystemError;
  message: string;
}

export interface JudgingMessage {
  verdict: JudgeVerdict;
  testcaseId: string;
  time: number; // ms
  memory: number; // KB
  pass: number;
  stdout?: string;
  stderr?: string;
  checkerOut?: string;
}

export type ResultMessage =
  | WaitingMessage
  | CompilingMessage
  | FinishedMessage
  | JudgingMessage
  | ErrorMessage;
