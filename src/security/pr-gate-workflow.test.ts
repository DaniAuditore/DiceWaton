// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const workflowPath = path.resolve(repoRoot, '.github/workflows/security-baseline.yml');

describe('security baseline workflow PR gate contract', () => {
  it('defines deterministic PR gate requirements at repo level', async () => {
    const workflow = await readFile(workflowPath, 'utf8');

    expect(workflow).toContain('name: security-baseline');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('branches:');
    expect(workflow).toContain('- main');

    expect(workflow).toContain('security-baseline:');
    expect(workflow).toContain('needs:');
    expect(workflow).toContain('- sast');
    expect(workflow).toContain('- secrets');
    expect(workflow).toContain('- deps');
    expect(workflow).toContain('- sanity');

    expect(workflow).toContain('SECURITY_GATE_MODE: enforce');
    expect(workflow).toContain('node scripts/security/gate-evaluator.mjs');

    expect(workflow).toContain('name: security-baseline-report');
    expect(workflow).toContain('security-report.json');
    expect(workflow).toContain('security-summary.md');

    expect(workflow).toContain("if: always() && github.event_name == 'pull_request'");
    expect(workflow).toContain('security-baseline-summary');
  });
});
