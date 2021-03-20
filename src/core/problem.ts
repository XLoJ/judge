import * as path from 'path';
import * as fs from 'fs';
import { getLangConfig, PROBLEM_PATH } from '../configs';
import { TestCase } from './testcase';
import { Checker } from './checker';
import { Validator } from './validtor';
import { Generator } from './generator';
import { getLogger } from '../logger';

const logger = getLogger();

export class Problem {
  pid: number;
  name: string;
  basePath: string;

  constructor(pid: number, name: string, basePath?: string) {
    this.pid = pid;
    this.name = name;
    this.basePath = basePath ?? `${pid}-${name}`;
  }

  get localBasePath() {
    return path.join(PROBLEM_PATH, this.basePath);
  }

  get minioBasePath() {
    return this.basePath;
  }

  private minioTestcasesBasePath(version: number) {
    return path.join(this.minioBasePath, 'testcases', String(version));
  }

  private localTestcasesBasePath(version: number) {
    return path.join(this.localBasePath, 'testcases', String(version));
  }

  testcase(version: number, name: string): TestCase {
    return new TestCase(name, this.localTestcasesBasePath(version));
  }

  checker(version: number, name: string, lang: string): Checker {
    const filename = `${version}-${name}.${
      getLangConfig(lang).compiledExtension
    }`;
    return new Checker(filename, this.localBasePath, lang);
  }

  validator(name: string, lang: string): Validator {
    const filename = `${name}.${getLangConfig(lang).compiledExtension}`;
    return new Validator(filename, this.localBasePath, lang);
  }

  generator(name: string, lang: string): Generator {
    const filename = `${name}.${getLangConfig(lang).compiledExtension}`;
    return new Generator(filename, this.localBasePath, lang);
  }

  async ensureProblem() {
    try {
      await fs.promises.mkdir(this.localBasePath);
    } catch (err) {
      logger.error(err.message);
    }
  }

  async ensureTestcasesBasePath(version: number) {
    await this.ensureProblem();
    try {
      await fs.promises.mkdir(this.localTestcasesBasePath(version), {
        recursive: true
      });
    } catch (err) {
      logger.error(err.message);
    }
  }
}
