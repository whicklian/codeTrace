import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface ProjectBuildRequest {
  files: Record<string, string>;
  entryFile: string;
  language: 'cpp' | 'c' | 'python' | 'java' | 'javascript' | 'typescript' | 'sql';
  buildCommand?: string;
  stdinInput?: string;
}

export interface ProjectBuildResult {
  success: boolean;
  stage: 'build' | 'run' | 'complete';
  buildOutput: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export async function buildAndRunProject(req: ProjectBuildRequest): Promise<ProjectBuildResult> {
  const runId = uuidv4();
  const workDir = path.join(os.tmpdir(), `codetrace_proj_${runId}`);
  const startTime = Date.now();

  try {
    await fs.mkdir(workDir, { recursive: true });

    // 1. Write all project files to directory
    for (const [relativePath, content] of Object.entries(req.files)) {
      const fullPath = path.join(workDir, relativePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }

    const lang = req.language.toLowerCase();
    const entryFile = req.entryFile || getDefaultEntryFile(lang, req.files);
    const entryFullPath = path.join(workDir, entryFile);

    // 2. Build Stage (for compiled languages C, C++)
    if (lang === 'cpp' || lang === 'c') {
      const binaryPath = path.join(workDir, 'project_bin');
      let compileCmd = 'g++';
      let compileArgs: string[] = [];

      if (req.buildCommand) {
        const parts = req.buildCommand.split(' ');
        compileCmd = parts[0];
        compileArgs = parts.slice(1);
      } else {
        // Collect all source files
        const srcFiles = Object.keys(req.files)
          .filter(f => f.endsWith('.cpp') || f.endsWith('.c') || f.endsWith('.cc'))
          .map(f => path.join(workDir, f));

        compileArgs = ['-std=c++17', '-Wall', '-O2', ...srcFiles, '-o', binaryPath];
      }

      const buildRes = await runCommand(compileCmd, compileArgs, workDir);
      if (buildRes.exitCode !== 0) {
        return {
          success: false,
          stage: 'build',
          buildOutput: buildRes.stderr || buildRes.stdout || 'Compilation failed',
          stdout: '',
          stderr: buildRes.stderr,
          exitCode: buildRes.exitCode,
          durationMs: Date.now() - startTime
        };
      }

      // Execute Binary
      const execRes = await runCommand(binaryPath, [], workDir, req.stdinInput);
      return {
        success: execRes.exitCode === 0,
        stage: 'complete',
        buildOutput: buildRes.stdout || 'Build successful (g++ -std=c++17)',
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        exitCode: execRes.exitCode,
        durationMs: Date.now() - startTime
      };
    }

    // 3. Python Execution
    if (lang === 'python') {
      const execRes = await runCommand('python3', [entryFullPath], workDir, req.stdinInput);
      return {
        success: execRes.exitCode === 0,
        stage: 'complete',
        buildOutput: 'Python 3 script executed directly',
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        exitCode: execRes.exitCode,
        durationMs: Date.now() - startTime
      };
    }

    // 4. Java Execution
    if (lang === 'java') {
      const execRes = await runCommand('java', [entryFullPath], workDir, req.stdinInput);
      return {
        success: execRes.exitCode === 0,
        stage: 'complete',
        buildOutput: 'Java runtime direct compilation & execution',
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        exitCode: execRes.exitCode,
        durationMs: Date.now() - startTime
      };
    }

    // 5. JavaScript / TypeScript Execution
    if (lang === 'javascript' || lang === 'typescript') {
      const runner = lang === 'typescript' ? 'npx' : 'node';
      const runnerArgs = lang === 'typescript' ? ['tsx', entryFullPath] : [entryFullPath];
      const execRes = await runCommand(runner, runnerArgs, workDir, req.stdinInput);
      return {
        success: execRes.exitCode === 0,
        stage: 'complete',
        buildOutput: `${lang.toUpperCase()} executed with Node runtime`,
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        exitCode: execRes.exitCode,
        durationMs: Date.now() - startTime
      };
    }

    // Default Fallback
    return {
      success: false,
      stage: 'complete',
      buildOutput: `Language ${req.language} runner not configured`,
      stdout: '',
      stderr: 'Unsupported language for execution',
      exitCode: 1,
      durationMs: Date.now() - startTime
    };

  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function getDefaultEntryFile(lang: string, files: Record<string, string>): string {
  const filenames = Object.keys(files);
  if (lang === 'cpp' || lang === 'c') {
    return filenames.find(f => f.startsWith('main.')) || filenames[0];
  }
  if (lang === 'python') {
    return filenames.find(f => f === 'main.py' || f === 'app.py') || filenames[0];
  }
  if (lang === 'java') {
    return filenames.find(f => f.endsWith('.java')) || filenames[0];
  }
  if (lang === 'javascript' || lang === 'typescript') {
    return filenames.find(f => f.startsWith('index.') || f.startsWith('main.')) || filenames[0];
  }
  return filenames[0] || 'main';
}

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  stdinInput?: string,
  timeoutMs: number = 10000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({
        stdout,
        stderr: stderr + '\n[Execution Timeout: process killed after 10 seconds]',
        exitCode: 124
      });
    }, timeoutMs);

    if (stdinInput && proc.stdin) {
      proc.stdin.write(stdinInput);
      proc.stdin.end();
    }

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 0
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: err.message,
        exitCode: 1
      });
    });
  });
}
