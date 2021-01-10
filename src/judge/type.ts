import S from 'fluent-json-schema';

export interface SubmissionInfoDTO {
  id: string;

  lang: string;
}

export interface JudgeSubmissionDTO {
  id: string;

  maxTime: number; // seconds

  maxMemory: number; // mega bytes

  checker: SubmissionInfoDTO;

  cases: string[];

  lang: string;

  code: string;

  returnReport: boolean;

  isTestAllCases: boolean;
}

export const SubmissionInfoSchema = S.object()
  .id('SubmissionInfo')
  .prop('id', S.string().required())
  .prop('lang', S.string().required());

export const JudgeSubmissionSchema = S.object()
  .id('JudgeSubmission')
  .prop('id', S.string().required())
  .prop('maxTime', S.number().minimum(1).maximum(16).required())
  .prop('maxMemory', S.number().minimum(32).maximum(2048).required())
  .prop('checker', S.ref('SubmissionInfo'))
  .prop('cases', S.array().items(S.string()).default([]))
  .prop('lang', S.string().default('cpp'))
  .prop('code', S.string().required())
  .prop('returnReport', S.boolean().default(true))
  .prop('isTestAllCases', S.boolean().default(false));
