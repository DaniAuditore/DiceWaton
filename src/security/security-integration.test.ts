// @vitest-environment node
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const aggregatePath = path.resolve(repoRoot, 'scripts/security/aggregate-security-report.mjs');
const gatePath = path.resolve(repoRoot, 'scripts/security/gate-evaluator.mjs');
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

async function setupCase(payloads: Record<string, unknown>) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'security-int-'));
  cleanup.push(cwd);
  for (const [name, payload] of Object.entries(payloads)) {
    await writeFile(path.join(cwd, `${name}.json`), JSON.stringify(payload));
  }
  await runNode(aggregatePath, cwd);
  return cwd;
}

describe('security baseline integration scenarios', () => {
  it('clean PR passes', async () => {
    const cwd = await setupCase({});
    const gate = await runNode(gatePath, cwd, { SECURITY_GATE_MODE: 'enforce' });
    expect(gate.code).toBe(0);
    const report = JSON.parse(await readFile(path.join(cwd, 'security-report.json'), 'utf8'));
    expect(report.findings).toHaveLength(0);
  });

  it('medium-only PR passes in enforce mode', async () => {
    const cwd = await setupCase({
      'semgrep-report': {
        results: [{ check_id: 'm1', path: 'src/a.ts', start: { line: 1 }, extra: { severity: 'medium', message: 'm' } }],
      },
    });
    const gate = await runNode(gatePath, cwd, { SECURITY_GATE_MODE: 'enforce' });
    expect(gate.code).toBe(0);
  });

  it('critical-new PR blocks in enforce mode', async () => {
    const cwd = await setupCase({
      'supabase-sanity-report': {
        findings: [{ severity: 'critical', status: 'new', ruleId: 'sanity/crit', file: 'x.sql' }],
      },
    });
    const gate = await runNode(gatePath, cwd, { SECURITY_GATE_MODE: 'enforce' });
    expect(gate.code).toBe(1);
    expect(gate.stderr).toContain('result=fail');
  });
});
