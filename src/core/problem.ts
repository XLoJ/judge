import * as path from 'path';
import * as fs from 'fs';
import { constants, promises } from 'fs';
import { getLangConfig, PROBLEM_PATH } from '../configs';
import { TestCase } from './testcase';
import { Checker } from './checker';
import { Validator } from './validtor';
import { Generator } from './generator';
import { getLogger } from '../logger';
import { downloadFile } from '../minio';
import { b64decode } from '../utils';

const logger = getLogger();

export class Problem {
  name: string;
  basePath: string;

  constructor(name: string, basePath?: string) {
    this.name = name;
    this.basePath = basePath ?? `${name}`;
  }

  get localBasePath() {
    return path.join(PROBLEM_PATH, this.basePath);
  }

  get minioBasePath() {
    return this.basePath;
  }

  testcase(version: number, name: string): TestCase {
    return new TestCase(name, this.localTestcasesBasePath(version));
  }

  checker(name: string, lang: string): Checker {
    const filename = `${name}.${getLangConfig(lang).compiledExtension}`;
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

  async ensureChecker(name: string, lang: string) {
    const checker = this.checker(name, lang);
    try {
      await promises.access(checker.fullFilePath, constants.R_OK);
    } catch (err) {
      const minioPath = path.join(this.minioBasePath, name);
      const content = JSON.parse(await downloadFile(minioPath));
      await checker.compile(b64decode(content.body));
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

  minioTestcasesBasePath(version: number) {
    return path.join(this.minioBasePath, 'testcases', String(version));
  }

  localTestcasesBasePath(version: number) {
    return path.join(this.localBasePath, 'testcases', String(version));
  }
}
