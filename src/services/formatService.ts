import { spawn } from 'child_process';

export const formatCodeService = async (code: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    let clangFormatExe = 'clang-format';
    try {
      clangFormatExe = require('clang-format').getNativeBinary();
    } catch (err) {
      console.warn('Could not load clang-format native binary, falling back to system command.');
    }

    const formatProcess = spawn(clangFormatExe, ['--assume-filename=main.cpp'], {
      shell: false
    });

    let formattedCode = '';
    let errorOutput = '';

    formatProcess.stdout.on('data', (data) => {
      formattedCode += data.toString();
    });

    formatProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    formatProcess.on('close', (codeStatus) => {
      if (codeStatus === 0) {
        resolve(formattedCode);
      } else {
        reject(new Error(`Formatting failed with status ${codeStatus}: ${errorOutput}`));
      }
    });

    formatProcess.on('error', (err) => {
      reject(new Error(`Failed to start clang-format: ${err.message}`));
    });

    formatProcess.stdin.write(code);
    formatProcess.stdin.end();
  });
};
