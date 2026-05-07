// @vitest-environment node
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const scriptPath = path.resolve(repoRoot, 'scripts/security/aggregate-security-report.mjs');

const cleanup: string[] = [];

async function runNode(script: string, cwd: string) {
  const { spawn } = await import('node:child_process');
  return await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const proc = spawn(process.execPath, [script], { cwd, env: process.env });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += String(d)));
    proc.stderr.on('data', (d) => (stderr += String(d)));
    proc.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

async function fixture(name: string) {
  return readFile(path.join(__dirname, 'fixtures', name), 'utf8');
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(cleanup.map((dir) => rm(dir, { recursive: true, force: true })));
  cleanup.length = 0;
});

describe('aggregate-security-report', () => {
  it('parses tool outputs with severity and status new|existing|excepted', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'security-agg-'));
    cleanup.push(cwd);

    await writeFile(path.join(cwd, 'semgrep-report.json'), await fixture('semgrep-report.json'));
    await writeFile(path.join(cwd, 'gitleaks-report.json'), await fixture('gitleaks-report.json'));
    await writeFile(path.join(cwd, 'deps-report.json'), await fixture('deps-report.json'));
    await writeFile(path.join(cwd, 'supabase-sanity-report.json'), await fixture('supabase-sanity-report.json'));
    await writeFile(path.join(cwd, 'config-sanity-report.json'), await fixture('config-sanity-report.json'));

    const result = await runNode(scriptPath, cwd);
    expect(result.code).toBe(0);

    const reportRaw = await readFile(path.join(cwd, 'security-report.json'), 'utf8');
    const report = JSON.parse(reportRaw);

    expect(report.findings).toHaveLength(6);
    expect(report.summary).toEqual({ low: 0, medium: 3, high: 1, critical: 2 });
    expect(report.findings.map((f: { status: string }) => f.status)).toEqual(
      expect.arrayContaining(['new', 'existing', 'excepted']),
    );
  });
});
