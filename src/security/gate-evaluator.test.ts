// @vitest-environment node
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const scriptPath = path.resolve(repoRoot, 'scripts/security/gate-evaluator.mjs');
const cleanup: string[] = [];

async function runNode(script: string, cwd: string, env: NodeJS.ProcessEnv = {}) {
  const { spawn } = await import('node:child_process');
  return await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const proc = spawn(process.execPath, [script], { cwd, env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += String(d)));
    proc.stderr.on('data', (d) => (stderr += String(d)));
    proc.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(cleanup.map((dir) => rm(dir, { recursive: true, force: true })));
  cleanup.length = 0;
});

describe('gate-evaluator', () => {
  it('passes when findings are low/medium only', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'security-gate-'));
    cleanup.push(cwd);
    await writeFile(
      path.join(cwd, 'security-report.json'),
      JSON.stringify({ findings: [{ severity: 'medium', status: 'new', tool: 'semgrep', ruleId: 'x' }] }),
    );

    const res = await runNode(scriptPath, cwd, { SECURITY_GATE_MODE: 'enforce' });
    expect(res.code).toBe(0);
    expect(res.stdout).toContain('result=pass');
  });

  it('fails in enforce mode when there is new critical/high', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'security-gate-'));
    cleanup.push(cwd);
    await writeFile(
      path.join(cwd, 'security-report.json'),
      JSON.stringify({ findings: [{ severity: 'critical', status: 'new', tool: 'semgrep', ruleId: 'crit' }] }),
    );

    const res = await runNode(scriptPath, cwd, { SECURITY_GATE_MODE: 'enforce' });
    expect(res.code).toBe(1);
    expect(res.stderr).toContain('result=fail');
  });

  it('warns in warn mode for new critical/high but does not block', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'security-gate-'));
    cleanup.push(cwd);
    await writeFile(
      path.join(cwd, 'security-report.json'),
      JSON.stringify({ findings: [{ severity: 'high', status: 'new', tool: 'sanity', ruleId: 'h1' }] }),
    );

    const res = await runNode(scriptPath, cwd, { SECURITY_GATE_MODE: 'warn' });
    expect(res.code).toBe(0);
    expect(res.stderr).toContain('result=warn');
  });
});
