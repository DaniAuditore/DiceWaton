// @vitest-environment node
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const supabaseScript = path.resolve(repoRoot, 'scripts/security/supabase-sanity-check.mjs');
const configScript = path.resolve(repoRoot, 'scripts/security/config-sanity-check.mjs');
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

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(cleanup.map((dir) => rm(dir, { recursive: true, force: true })));
  cleanup.length = 0;
});

describe('sanity scenarios', () => {
  it('fails migration without RLS policy', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'security-sanity-'));
    cleanup.push(cwd);
    await mkdir(path.join(cwd, 'supabase/migrations'), { recursive: true });
    await writeFile(path.join(cwd, 'supabase/migrations/001.sql'), 'create table public.accounts(id uuid primary key);');

    const result = await runNode(supabaseScript, cwd);
    expect(result.code).toBe(1);
  });

  it('passes secure supabase config', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'security-sanity-'));
    cleanup.push(cwd);
    await mkdir(path.join(cwd, 'src/lib'), { recursive: true });
    await writeFile(
      path.join(cwd, 'src/lib/supabase.ts'),
      `const url = import.meta.env.VITE_SUPABASE_URL;\nconst key = import.meta.env.VITE_SUPABASE_ANON_KEY;\nexport const config = { url, key };\n`,
    );

    const result = await runNode(configScript, cwd);
    expect(result.code).toBe(0);
  });
});
