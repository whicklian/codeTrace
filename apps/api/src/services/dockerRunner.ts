import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface TraceResult {
  success: boolean;
  total_steps?: number;
  steps?: Array<{
    step: number;
    line: number;
    function: string | null;
    variables: Array<{
      name: string;
      value: string;
      address: string | null;
    }>;
  }>;
  fault_summary?: {
    signal: string;
    meaning: string;
    line: number | null;
    function: string | null;
  } | null;
  error?: string;
  details?: string;
}

export async function runInSandbox(code: string, language: 'c' | 'cpp' = 'cpp'): Promise<TraceResult> {
  const runId = uuidv4();
  const tmpDir = path.join(os.tmpdir(), `codetrace_${runId}`);
  await fs.mkdir(tmpDir, { recursive: true });

  const ext = language === 'cpp' ? 'cpp' : 'c';
  const sourceFileName = `main.${ext}`;
  const hostFilePath = path.join(tmpDir, sourceFileName);
  await fs.writeFile(hostFilePath, code, 'utf-8');

  try {
    // 1. Check if codetrace-sandbox image is available in Docker
    const hasDocker = await checkDockerImage('codetrace-sandbox');

    if (hasDocker) {
      return await executeViaDocker(tmpDir, sourceFileName, language);
    } else {
      // Direct local execution using native gdb_tracer.py
      return await executeDirect(hostFilePath, language);
    }
  } finally {
    // Cleanup temporary files
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function checkDockerImage(imageName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('docker', ['image', 'inspect', imageName], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

function executeViaDocker(hostDir: string, sourceFileName: string, language: string): Promise<TraceResult> {
  return new Promise((resolve) => {
    const args = [
      'run',
      '--rm',
      '--network', 'none',
      '--memory', '128m',
      '--cpus', '0.5',
      '-v', `${hostDir}:/workspace:ro`,
      'codetrace-sandbox',
      `/workspace/${sourceFileName}`,
      language
    ];

    const proc = spawn('docker', args);
    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({
        success: false,
        error: 'Execution Timeout',
        details: 'The execution exceeded the 10-second sandbox limit.'
      });
    }, 10000);

    proc.stdout.on('data', (data) => (stdout += data.toString()));
    proc.stderr.on('data', (data) => (stderr += data.toString()));

    proc.on('close', (code) => {
      clearTimeout(timeout);
      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch {
        resolve({
          success: false,
          error: 'Parser Error',
          details: stderr || stdout || `Process exited with code ${code}`
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: 'Docker Runner Failure',
        details: err.message
      });
    });
  });
}

function executeDirect(hostFilePath: string, language: string): Promise<TraceResult> {
  return new Promise((resolve) => {
    const tracerScript = path.resolve(process.cwd(), '../../sandbox/gdb_tracer.py');
    const proc = spawn('python3', [tracerScript, hostFilePath, language]);
    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({
        success: false,
        error: 'Execution Timeout',
        details: 'Process took longer than 10 seconds.'
      });
    }, 10000);

    proc.stdout.on('data', (data) => (stdout += data.toString()));
    proc.stderr.on('data', (data) => (stderr += data.toString()));

    proc.on('close', () => {
      clearTimeout(timeout);
      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch {
        resolve({
          success: false,
          error: 'Direct Tracer Error',
          details: stderr || stdout
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: 'Failed to launch local python gdb_tracer',
        details: err.message
      });
    });
  });
}
