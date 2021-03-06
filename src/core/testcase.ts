import { promises, constants } from 'fs';
import * as path from 'path';

import { makeTempDir, rimraf } from '../utils';
import { Verdict } from '../verdict';
import { getLogger } from '../logger';
import { downloadFile, uploadFile } from '../minio';

import { Result } from './result';
import { Generator } from './generator';

const logger = getLogger();

export class TestCase {
  name: string;
  basePath: string;
  inputFile: string;
  answerFile: string;

  constructor(name: string, basePath: string) {
    this.name = name;
    this.basePath = basePath;
    this.inputFile = path.join(basePath, `${name}.in`);
    this.answerFile = path.join(basePath, `${name}.ans`);
  }

  async ensure(minioPath: string) {
    try {
      await promises.access(this.inputFile, constants.R_OK);
    } catch (err) {
      const filepath = path.join(minioPath, `${this.name}.in`);
      logger.info(`Download ${this.inputFile} from ${filepath}`);
      const body = await downloadFile(filepath);
      await this.writeIn(body);
    }
    try {
      await promises.access(this.answerFile, constants.R_OK);
    } catch (err) {
      const filepath = path.join(minioPath, `${this.name}.ans`);
      logger.info(`Download ${this.answerFile} from ${filepath}`);
      const body = await downloadFile(filepath);
      await this.writeAns(body);
    }
  }

  readIn() {
    return promises.readFile(this.inputFile, 'utf8');
  }

  readAnswer() {
    return promises.readFile(this.answerFile, 'utf8');
  }

  async writeIn(content: string): Promise<void> {
    await promises.writeFile(this.inputFile, content, 'utf8');
  }

  private async writeAns(content: string = ''): Promise<void> {
    await promises.writeFile(this.answerFile, content, 'utf8');
  }

  async downloadIn(minioFilePath: string) {
    logger.info(`Download ${this.inputFile} from ${minioFilePath}`);
    const body = await downloadFile(minioFilePath);
    await this.writeIn(body);
  }

  async uploadToMinio(minioPath: string) {
    {
      const filepath = path.join(minioPath, `${this.name}.in`);
      logger.info(`Upload ${this.inputFile} to ${filepath}`);
      await uploadFile(filepath, this.inputFile);
    }
    {
      const filepath = path.join(minioPath, `${this.name}.ans`);
      logger.info(`Upload ${this.answerFile} to ${filepath}`);
      await uploadFile(filepath, this.answerFile);
    }
  }

  async genIn(generator: Generator, args: string[] = []): Promise<Result> {
    await this.clear();
    await this.writeIn('');

    const runDir = await makeTempDir();
    const genDir = await makeTempDir();
    const genErr = path.join(genDir, 'gen.err');

    try {
      // Run in 15s and 1024MB
      const result = await generator.run({
        workDir: runDir,
        fileBindings: [
          {
            mode: '-R',
            src: generator.fullFilePath,
            dst: generator.execute.file
          }
        ],
        executeCommand: generator.execute.command,
        executeArgs: [...generator.execute.args, ...args],
        maxTime: 15,
        maxMemory: 1024,
        stdoutFile: this.inputFile,
        stderrFile: genErr,
        trusted: true
      });
      if (result.verdict === Verdict.Accepted) {
        return result;
      } else {
        result.message = (await promises.readFile(genErr, 'utf8')).trim();
        await this.clear();
        return result;
      }
    } catch (err) {
      await this.clear();
      throw err;
    } finally {
      await rimraf(runDir);
      await rimraf(genDir);
    }
  }

  async genAns(generator: Generator): Promise<Result> {
    await this.writeAns();

    const runDir = await makeTempDir();
    const genDir = await makeTempDir();
    const genErr = path.join(genDir, 'gen.err');

    try {
      // Run in 15s and 1024MB
      const result = await generator.run({
        workDir: runDir,
        fileBindings: [
          {
            mode: '-R',
            src: generator.fullFilePath,
            dst: generator.execute.file
          }
        ],
        maxTime: 15,
        maxMemory: 1024,
        stdinFile: this.inputFile,
        stdoutFile: this.answerFile,
        stderrFile: genErr,
        trusted: true
      });
      if (result.verdict === Verdict.Accepted) {
        return result;
      } else {
        result.message = (await promises.readFile(genErr, 'utf8')).trim();
        await rimraf(this.answerFile);
        return result;
      }
    } catch (err) {
      await rimraf(this.answerFile);
      throw err;
    } finally {
      await rimraf(runDir);
      await rimraf(genDir);
    }
  }

  async clear() {
    try {
      await rimraf(this.inputFile);
      await rimraf(this.answerFile);
    } catch (err) {}
  }
}
