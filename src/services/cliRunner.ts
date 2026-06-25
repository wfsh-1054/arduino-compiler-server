import { exec, spawn } from 'child_process';
import { ARDUINO_DATA_DIR, ARDUINO_USER_DIR, getCliPath } from '../config/paths';

export function execArduinoCli(args: string): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        const cliPath = getCliPath();
        const cmd = `"${cliPath}" ${args}`;
        const env = {
            ...process.env,
            ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR,
            ARDUINO_DATA_DIR,
            ARDUINO_USER_DIR
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
    const env = { ...process.env, ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR, ARDUINO_DATA_DIR, ARDUINO_USER_DIR };
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
