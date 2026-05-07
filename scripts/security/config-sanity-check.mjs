import { readFile, writeFile } from 'node:fs/promises';

const target = 'src/lib/supabase.ts';
let source = '';

try {
  source = await readFile(target, 'utf8');
} catch {
  source = '';
}

const findings = [];

if (/VITE_SUPABASE_SERVICE_ROLE/i.test(source)) {
  findings.push({
    tool: 'sanity',
    severity: 'critical',
    status: 'new',
    ruleId: 'sanity/service-role-in-client',
    file: target,
    evidence: 'Client-side code references VITE_SUPABASE_SERVICE_ROLE.',
    recommendation: 'Never expose service role keys to frontend code. Use server-side secret management.',
  });
}

if (/\|\|\s*['"]dummy-key['"]/i.test(source)) {
  findings.push({
    tool: 'sanity',
    severity: 'high',
    status: 'new',
    ruleId: 'sanity/insecure-anon-key-fallback',
    file: target,
    evidence: 'Detected insecure anon key fallback literal (dummy-key).',
    recommendation: 'Avoid insecure production fallback values; gate fake mode behind explicit test flag.',
  });
}

if (/\|\|\s*['"]http:\/\/localhost:54321['"]/i.test(source)) {
  findings.push({
    tool: 'sanity',
    severity: 'medium',
    status: 'new',
    ruleId: 'sanity/insecure-url-fallback',
    file: target,
    evidence: 'Detected localhost URL fallback in Supabase client config.',
    recommendation: 'Prefer explicit environment validation and test-only fallback gating.',
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  findings,
};

await writeFile('config-sanity-report.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (findings.some((x) => x.severity === 'high' || x.severity === 'critical')) {
  process.exit(1);
}
