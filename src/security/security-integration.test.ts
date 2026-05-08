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
      'semgrep-report': {
        results: [
          {
            check_id: 'owasp/no-sql-injection',
            path: 'src/db/query.ts',
            start: { line: 14 },
            extra: { severity: 'critical', message: 'Raw dynamic SQL from user input' },
          },
        ],
      },
    });
    const gate = await runNode(gatePath, cwd, { SECURITY_GATE_MODE: 'enforce' });
    expect(gate.code).toBe(1);
    expect(gate.stderr).toContain('result=fail');
  });

  it('exposed secret in PR blocks in enforce mode', async () => {
    const cwd = await setupCase({
      'gitleaks-report': [
        {
          RuleID: 'generic-api-key',
          File: 'src/config.ts',
          StartLine: 8,
          Description: 'Live token committed by mistake',
          Severity: 'critical',
          Status: 'new',
        },
      ],
    });

    const gate = await runNode(gatePath, cwd, { SECURITY_GATE_MODE: 'enforce' });
    expect(gate.code).toBe(1);
    expect(gate.stderr).toContain('result=fail');
  });

  it('migration without RLS blocks in enforce mode', async () => {
    const cwd = await setupCase({
      'supabase-sanity-report': {
        findings: [
          {
            severity: 'critical',
            status: 'new',
            ruleId: 'sanity/missing-rls-policy',
            file: 'supabase/migrations/20260506_add_accounts.sql',
            evidence: 'Table public.accounts has no ENABLE RLS and no CREATE POLICY',
          },
        ],
      },
    });

    const gate = await runNode(gatePath, cwd, { SECURITY_GATE_MODE: 'enforce' });
    expect(gate.code).toBe(1);
    expect(gate.stderr).toContain('result=fail');
  });

  it('secrets allowlisted/excepted does not block enforce gate', async () => {
    const cwd = await setupCase({
      'gitleaks-report': [
        {
          RuleID: 'generic-api-key',
          File: 'src/example.ts',
          StartLine: 3,
          Description: 'Dummy test token',
          Status: 'excepted',
        },
      ],
    });

    const gate = await runNode(gatePath, cwd, { SECURITY_GATE_MODE: 'enforce' });
    expect(gate.code).toBe(0);

    const report = JSON.parse(await readFile(path.join(cwd, 'security-report.json'), 'utf8'));
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].tool).toBe('gitleaks');
    expect(report.findings[0].status).toBe('excepted');
  });

  it('dependency gate blocks runtime critical while dev medium remains non-blocking', async () => {
    const cwd = await setupCase({
      'deps-report': {
        vulnerabilities: {
          axios: {
            severity: 'critical',
            status: 'new',
            dev: false,
            via: ['CVE-2026-9001'],
            fixAvailable: true,
          },
          vitest: {
            severity: 'medium',
            status: 'new',
            dev: true,
            via: ['CVE-2026-1111'],
            fixAvailable: false,
          },
        },
      },
    });

    const gate = await runNode(gatePath, cwd, { SECURITY_GATE_MODE: 'enforce' });
    expect(gate.code).toBe(1);
    expect(gate.stderr).toContain('result=fail');

    const report = JSON.parse(await readFile(path.join(cwd, 'security-report.json'), 'utf8')) as {
      findings: Array<{ ruleId: string; severity: string; dependencyType: string }>;
    };
    const runtimeCritical = report.findings.find((finding) => finding.ruleId === 'npm-audit/axios');
    const devMedium = report.findings.find((finding) => finding.ruleId === 'npm-audit/vitest');
    expect(runtimeCritical?.severity).toBe('critical');
    expect(runtimeCritical?.dependencyType).toBe('runtime');
    expect(devMedium?.severity).toBe('medium');
    expect(devMedium?.dependencyType).toBe('dev');
  });
});
