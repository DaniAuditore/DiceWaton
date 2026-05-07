import { readFile, writeFile } from 'node:fs/promises';

const severityOrder = ['low', 'medium', 'high', 'critical'];

function normalizeSeverity(value) {
  if (!value) return 'low';
  const normalized = String(value).toLowerCase();
  if (severityOrder.includes(normalized)) return normalized;
  if (normalized === 'error') return 'high';
  if (normalized === 'warning' || normalized === 'warn') return 'medium';
  return 'low';
}

function toStatus() {
  return 'new';
}

async function readJsonIfExists(path) {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function semgrepFindings(payload) {
  if (!payload?.results) return [];
  return payload.results.map((item) => ({
    tool: 'semgrep',
    severity: normalizeSeverity(item.extra?.severity),
    status: toStatus(),
    ruleId: item.check_id ?? 'semgrep/unknown',
    file: item.path,
    line: item.start?.line,
    evidence: item.extra?.message,
    recommendation: item.extra?.metadata?.owasp?.join(', ') ?? 'Review Semgrep finding',
  }));
}

function gitleaksFindings(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map((item) => ({
    tool: 'gitleaks',
    severity: 'critical',
    status: toStatus(),
    ruleId: item.RuleID ?? 'gitleaks/unknown',
    file: item.File,
    line: item.StartLine,
    evidence: item.Description ?? item.Match,
    recommendation: 'Remove secret and rotate leaked credential',
  }));
}

function npmAuditFindings(payload) {
  const vulnerabilities = payload?.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== 'object') return [];
  return Object.entries(vulnerabilities).map(([pkg, vuln]) => ({
    tool: 'npm-audit',
    severity: normalizeSeverity(vuln.severity),
    status: toStatus(),
    ruleId: `npm-audit/${pkg}`,
    file: 'package-lock.json',
    evidence: vuln.via?.map((x) => (typeof x === 'string' ? x : x.title)).filter(Boolean).join('; '),
    recommendation: vuln.fixAvailable ? 'Apply available dependency fix' : 'Update dependency manually',
  }));
}

function sanityFindings(payload, toolName) {
  if (!Array.isArray(payload?.findings)) return [];
  return payload.findings.map((item) => ({
    tool: toolName,
    severity: normalizeSeverity(item.severity),
    status: toStatus(),
    ruleId: item.ruleId ?? `${toolName}/unknown`,
    file: item.file,
    line: item.line,
    evidence: item.evidence,
    recommendation: item.recommendation,
  }));
}

function summarize(findings) {
  const base = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const finding of findings) {
    base[finding.severity] = (base[finding.severity] ?? 0) + 1;
  }
  return base;
}

const [
  semgrep = await readJsonIfExists('semgrep-report.json'),
  gitleaks = await readJsonIfExists('gitleaks-report.json'),
  deps = await readJsonIfExists('deps-report.json'),
  supabaseSanity = await readJsonIfExists('supabase-sanity-report.json'),
  configSanity = await readJsonIfExists('config-sanity-report.json'),
] = await Promise.all([
  readJsonIfExists('semgrep-report.json'),
  readJsonIfExists('gitleaks-report.json'),
  readJsonIfExists('deps-report.json'),
  readJsonIfExists('supabase-sanity-report.json'),
  readJsonIfExists('config-sanity-report.json'),
]);

const findings = [
  ...semgrepFindings(semgrep),
  ...gitleaksFindings(gitleaks),
  ...npmAuditFindings(deps),
  ...sanityFindings(supabaseSanity, 'sanity'),
  ...sanityFindings(configSanity, 'sanity'),
];

const report = {
  generatedAt: new Date().toISOString(),
  summary: summarize(findings),
  findings,
};

await writeFile('security-report.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
