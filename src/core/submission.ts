import * as path from 'path';
import { promises } from 'fs';

import {
  COMPILER_GROUP_ID,
  COMPILER_USER_ID,
  ENV,
  getLangConfig,
  ILangConfig,
  NSJAIL_PATH,
  OUTPUT_LIMIT,
  RUN_GROUP_ID,
  RUN_USER_ID,
  SUB_PATH
} from '../configs';
import { exec, isDef, makeTempDir, randomString, rimraf } from '../utils';
import { Verdict } from '../verdict';
import { getLogger } from '../logger';
import { CompileError, SystemError, TestCaseError } from '../error';

import { IFileBinding, ISubmissionRunParam, SubmissionType } from './type';
import { usageToResult } from './result';

const envArgs = ENV.reduce((args: string[], env: string) => {
  args.push('-E', env);
  return args;
}, []);

const logger = getLogger();

export class Submission {
  lang: string;
  langConfig: ILangConfig;
  type: SubmissionType;
  execute: {
    file: string;
    dir: string;
    command: string;
    args: string[];
  };

  constructor(
    lang: string,
    type = SubmissionType.SUB,
    options?: { file: string; dir: string }
  ) {
    this.lang = lang;
    this.langConfig = getLangConfig(lang);
    this.type = type;

    const file = isDef(options) ? options.file : undefined;
    const dir = isDef(options) ? options.dir : undefined;

    const fileName = isDef(file)
      ? file
      : randomString() + '.' + this.langConfig.compiledExtension;

    this.execute = {
      file: fileName,
      dir: isDef(dir) ? dir : SUB_PATH,
      command: this.langConfig.execute.command.replace(
        '${executableFile}',
        fileName
      ),
      args: this.langConfig.execute.args.map((str) =>
        String(str).replace('${executableFile}', fileName)
      )
    };
  }

  get fullFilePath() {
    return path.join(this.execute.dir, this.execute.file);
  }

  private static buildNsjailArgs(
    workDir: string,
    rootDir: string,
    infoDir: string,
    trusted: boolean,
    fileBindings: IFileBinding[],
    maxTime: number,
    maxMemory: number
  ) {
    const uid = trusted ? COMPILER_USER_ID : RUN_USER_ID;
    const gid = trusted ? COMPILER_GROUP_ID : RUN_GROUP_ID;

    const nsjailArgs = [
      '-Mo',
      '--chroot',
      rootDir,
      '--user',
      uid,
      '--group',
      gid,
      '--log',
      path.join(infoDir, 'log'),
      '--usage',
      path.join(infoDir, 'usage'),
      '-R',
      '/bin',
      '-R',
      '/lib',
      '-R',
      '/lib64',
      '-R',
      '/usr',
      '-R',
      '/sbin',
      '-R',
      '/dev',
      '-R',
      '/etc',
      trusted ? '-B' : '-R',
      workDir + ':/app'
    ];

    const readlTimeLimit = maxTime * 2;

    const limitArgs = [
      '--cgroup_pids_max',
      64,
      '--cgroup_cpu_ms_per_sec',
      1000,
      '--cgroup_mem_max',
      (maxMemory + 32) * 1024 * 1024,
      '--time_limit',
      readlTimeLimit + 1,
      '--rlimit_cpu',
      maxTime + 1,
      '--rlimit_as',
      'inf',
      '--rlimit_stack',
      Math.max(maxMemory + 32, 256),
      '--rlimit_fsize',
      OUTPUT_LIMIT
    ];

    const extraFiles = [];
    for (const { src, dst, mode } of fileBindings) {
      extraFiles.push(mode, src + ':/app/' + dst);
    }

    return [
      ...nsjailArgs,
      ...extraFiles,
      '-D',
      '/app',
      ...limitArgs,
      ...envArgs,
      '--'
    ];
  }

  private static async prepareWorkDir() {
    return Promise.all([makeTempDir(), makeTempDir()]);
  }

  private static async clearWorkDir(rootDir: string, infoDir: string) {
    await Promise.all([rimraf(rootDir), rimraf(infoDir)]);
  }

  private static async openRedirect(
    stdinFile?: string,
    stdoutFile?: string,
    stderrFile?: string
  ) {
    const result: Array<'ignore' | promises.FileHandle> = [
      'ignore',
      'ignore',
      'ignore'
    ];
    try {
      if (stdinFile) {
        result[0] = await promises.open(stdinFile, 'r');
      }
      if (stdoutFile) {
        result[1] = await promises.open(stdoutFile, 'w');
      }
      if (stderrFile) {
        result[2] = await promises.open(stderrFile, 'w');
      }
      return result;
    } catch (err) {
      throw new TestCaseError(err.message);
    }
  }

  private static async closeRedirect(
    stdin: 'ignore' | promises.FileHandle,
    stdout: 'ignore' | promises.FileHandle,
    stderr: 'ignore' | promises.FileHandle
  ) {
    const closeTasks = [];
    if (stdin !== 'ignore') {
      closeTasks.push(stdin.close());
    }
    if (stdout !== 'ignore') {
      closeTasks.push(stdout.close());
    }
    if (stderr !== 'ignore') {
      closeTasks.push(stderr.close());
    }
    return Promise.all(closeTasks);
  }

  clear() {
    return promises.unlink(this.fullFilePath);
  }

  async compile(code: string, maxTime = 16) {
    const compileDir = await makeTempDir();
    const outFile = path.join(compileDir, 'compile');
    const errorFile = path.join(compileDir, 'compile.err');

    await Promise.all([
      promises.writeFile(
        path.join(compileDir, this.langConfig.sourceFileName),
        code
      ),
      promises.writeFile(outFile, ''),
      promises.writeFile(errorFile, '')
    ]);

    const compileConfigs = this.langConfig.compile;
    const compileSteps =
      compileConfigs instanceof Array ? compileConfigs : [compileConfigs];

    try {
      for (const { command, args, out = 'compile.out' } of compileSteps) {
        const result = await this.run({
          workDir: compileDir,
          executeCommand: command,
          executeArgs: args.map((str) => {
            if (str === '${sourceFile}') {
              return this.langConfig.sourceFileName;
            } else if (str === '${compiledFile}') {
              return out;
            }
            return str;
          }),
          trusted: true,
          maxTime,
          maxMemory: 1024,
          stdoutFile: outFile,
          stderrFile: errorFile
        });

        if (result.verdict !== Verdict.Accepted) {
          const errorMsg = await promises.readFile(errorFile, 'utf8');
          if (errorMsg !== '') {
            throw new CompileError(errorMsg);
          } else if (result.verdict === Verdict.TimeLimitExceeded) {
            throw new CompileError('Time limit exceeded when compiling');
          } else if (result.verdict === Verdict.MemoryLimitExceeded) {
            throw new CompileError('Memory limit exceeded when compiling');
          } else {
            throw new CompileError(
              'Something is wrong, but nothing is reported'
            );
          }
        }
      }

      const executeFilePath = this.fullFilePath;
      await promises.copyFile(
        path.join(compileDir, 'compile.out'),
        executeFilePath
      );
      await promises.chmod(executeFilePath, 0o0775);
    } catch (err) {
      throw err;
    } finally {
      await rimraf(compileDir);
    }
  }

  async run({
    workDir,
    fileBindings = [],
    trusted = false,
    executeCommand = this.execute.command,
    executeArgs = this.execute.args,
    maxTime,
    maxMemory,
    stdinFile = undefined,
    stdoutFile = undefined,
    stderrFile = undefined
  }: ISubmissionRunParam) {
    const [rootDir, infoDir] = await Submission.prepareWorkDir();

    try {
      const [stdin, stdout, stderr] = await Submission.openRedirect(
        stdinFile,
        stdoutFile,
        stderrFile
      );

      try {
        await exec(
          NSJAIL_PATH,
          [
            ...Submission.buildNsjailArgs(
              workDir,
              rootDir,
              infoDir,
              trusted,
              fileBindings,
              maxTime,
              maxMemory
            ),
            executeCommand,
            ...executeArgs
          ],
          {
            stdio: [stdin, stdout, stderr],
            uid: 0,
            gid: 0
          }
        );

        await Submission.closeRedirect(stdin, stdout, stderr);

        return await usageToResult(infoDir, maxTime, maxMemory, maxTime * 2);
      } catch (err) {
        // TODO: Logger here
        if (isDef(err)) {
          throw new SystemError(err.message);
        } else {
          throw new SystemError('Unknown System Error');
        }
      }
    } catch (err) {
      throw err;
    } finally {
      await Submission.clearWorkDir(rootDir, infoDir);
    }
  }
}
