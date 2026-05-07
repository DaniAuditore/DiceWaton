import { readFile } from 'node:fs/promises';

function isBlocking(finding) {
  const severity = String(finding.severity ?? '').toLowerCase();
  const status = String(finding.status ?? '').toLowerCase();
  return (severity === 'high' || severity === 'critical') && status === 'new';
}

const mode = (process.env.SECURITY_GATE_MODE ?? 'warn').toLowerCase();
const enforce = mode === 'enforce';

const raw = await readFile('security-report.json', 'utf8');
const report = JSON.parse(raw);
const findings = Array.isArray(report.findings) ? report.findings : [];
const blocking = findings.filter(isBlocking);

const header = `[security-gate] mode=${mode} blocking_findings=${blocking.length}`;
if (blocking.length === 0) {
  console.log(`${header} result=pass`);
  process.exit(0);
}

for (const finding of blocking) {
  console.log(
    `- ${finding.tool}:${finding.ruleId} severity=${finding.severity} file=${finding.file ?? 'n/a'} line=${finding.line ?? 'n/a'}`,
  );
}

if (enforce) {
  console.error(`${header} result=fail`);
  process.exit(1);
}

console.warn(`${header} result=warn`);
process.exit(0);
