import { isDef } from '../utils';
import { SystemError } from '../error';

interface ICompileConfig {
  command: string;
  args: string[];
  out?: string;
  // default out: compile.out
  // use last out as the final compile output name
}

export interface ILangConfig {
  sourceFileName: string;
  compile: ICompileConfig | ICompileConfig[];
  compiledExtension: string;
  execute: {
    command: string;
    args: string[];
  };
}

const LangConfig: Record<string, ILangConfig> = {
  c: {
    sourceFileName: 'sub.c',
    compile: {
      command: '/usr/bin/gcc',
      args: [
        '-static',
        '-O2',
        '-std=c99',
        '-DONLINE_JUDGE',
        '-lm',
        '-fmax-errors=127',
        '-o',
        '${compiledFile}',
        '${sourceFile}'
      ]
    },
    compiledExtension: 'bin',
    execute: {
      command: './${executableFile}',
      args: []
    }
  },
  cpp: {
    sourceFileName: 'sub.cpp',
    compile: {
      command: '/usr/bin/g++',
      args: [
        '-static',
        '-O2',
        '-std=c++11',
        '-DONLINE_JUDGE',
        '-lm',
        '-fmax-errors=127',
        '-o',
        '${compiledFile}',
        '${sourceFile}'
      ]
    },
    compiledExtension: 'bin11',
    execute: {
      command: './${executableFile}',
      args: []
    }
  },
  cc14: {
    sourceFileName: 'sub.cpp',
    compile: {
      command: '/usr/bin/g++',
      args: [
        '-static',
        '-O2',
        '-std=c++14',
        '-DONLINE_JUDGE',
        '-lm',
        '-fmax-errors=127',
        '-o',
        '${compiledFile}',
        '${sourceFile}'
      ]
    },
    compiledExtension: 'bin14',
    execute: {
      command: './${executableFile}',
      args: []
    }
  },
  cc17: {
    sourceFileName: 'sub.cpp',
    compile: {
      command: '/usr/bin/g++',
      args: [
        '-static',
        '-O2',
        '-std=c++17',
        '-DONLINE_JUDGE',
        '-lm',
        '-fmax-errors=127',
        '-o',
        '${compiledFile}',
        '${sourceFile}'
      ]
    },
    compiledExtension: 'bin17',
    execute: {
      command: './${executableFile}',
      args: []
    }
  },
  java: {
    sourceFileName: 'Main.java',
    compile: [
      {
        command: '/usr/bin/javac',
        args: ['-encoding', 'utf8', '-d', '.', '${sourceFile}'],
        out: 'Main.class'
      },
      {
        command: '/usr/bin/jar',
        args: ['-cvf', '${compiledFile}', 'Main.class']
      }
    ],
    compiledExtension: 'jar',
    execute: {
      command: '/usr/bin/java',
      args: ['-cp', '${executableFile}', 'Main']
    }
  },
  py2: {
    sourceFileName: 'sub.py',
    compile: {
      command: '/bin/cp',
      args: ['${sourceFile}', '${compiledFile}']
    },
    compiledExtension: 'py2',
    execute: {
      command: '/usr/bin/python',
      args: ['${executableFile}']
    }
  },
  python: {
    sourceFileName: 'sub.py',
    compile: {
      command: '/bin/cp',
      args: ['${sourceFile}', '${compiledFile}']
    },
    compiledExtension: 'py3',
    execute: {
      command: '/usr/bin/python3',
      args: ['${executableFile}']
    }
  },
  kotlin: {
    sourceFileName: 'sub.kt',
    compile: {
      command: '/usr/bin/kotlin/bin/kotlinc',
      args: ['${sourceFile}', '-include-runtime', '-d', '${compiledFile}'],
      out: 'compile.jar'
    },
    compiledExtension: 'jar',
    execute: {
      command: '/usr/bin/java',
      args: ['-jar', '${executableFile}']
    }
  },
  go: {
    sourceFileName: 'sub.go',
    compile: {
      command: '/usr/local/go/bin/go',
      args: ['build', '-o', '${compiledFile}', '${sourceFile}']
    },
    compiledExtension: 'bingo',
    execute: {
      command: './${executableFile}',
      args: []
    }
  },
  text: {
    sourceFileName: 'sub.txt',
    compile: {
      command: '/bin/cp',
      args: ['${sourceFile}', '${compiledFile}']
    },
    compiledExtension: 'txt',
    execute: {
      command: '/bin/cat',
      args: ['${executableFile}']
    }
  }
};

export function setLangConfig(lang: string, config: ILangConfig) {
  LangConfig[lang] = config;
}

export function getLangConfig(lang: string): ILangConfig {
  if (isDef(LangConfig[lang])) {
    return LangConfig[lang];
  } else {
    throw new SystemError(`Unsupported language <${lang}>`);
  }
}
