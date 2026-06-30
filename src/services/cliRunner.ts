import { exec, spawn } from 'child_process';
import { getArduinoDataDir, getArduinoUserDir, getCliPath } from '../config/paths';

export function execArduinoCli(args: string): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        const cliPath = getCliPath();
        const cmd = `"${cliPath}" ${args}`;
        const dataDir = getArduinoDataDir();
        const userDir = getArduinoUserDir();
        const env = {
            ...process.env,
            ARDUINO_DIRECTORIES_DATA: dataDir,
            ARDUINO_DATA_DIR: dataDir,
            ARDUINO_USER_DIR: userDir
        };
        exec(cmd, { env }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || stdout || error.message));
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

// 用於長時間執行的任務 (回傳進度)
export function spawnArduinoCli(args: string[], onData: (data: string) => void, onDone: (code: number) => void) {
    const cliPath = getCliPath();
    const dataDir = getArduinoDataDir();
    const userDir = getArduinoUserDir();
    const env = { ...process.env, ARDUINO_DIRECTORIES_DATA: dataDir, ARDUINO_DATA_DIR: dataDir, ARDUINO_USER_DIR: userDir };
    const proc = spawn(cliPath, args, { env });

    proc.stdout.on('data', d => {
        const lines = d.toString().split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line) onData(line);
        }
    });

    proc.stderr.on('data', d => {
        const s = d.toString().trim();
        if (s) onData(`[ERR] ${s}`);
    });

    proc.on('close', code => {
        if (code !== null) onDone(code);
    });
}
