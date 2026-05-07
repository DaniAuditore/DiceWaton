import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const migrationsDir = path.resolve('supabase/migrations');

function findTablesWithoutRls(sql, file) {
  const findings = [];
  const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_."]+)/gi;

  let match;
  while ((match = createTableRegex.exec(sql)) !== null) {
    const rawTable = match[1].replaceAll('"', '');
    const tableName = rawTable.includes('.') ? rawTable.split('.').at(-1) : rawTable;

    const enableRlsRegex = new RegExp(`alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:[a-zA-Z0-9_]+\\.)?"?${tableName}"?\\s+enable\\s+row\\s+level\\s+security`, 'i');
    const hasPolicyRegex = new RegExp(`create\\s+policy[\\s\\S]*?on\\s+(?:[a-zA-Z0-9_]+\\.)?"?${tableName}"?`, 'i');

    if (!enableRlsRegex.test(sql) || !hasPolicyRegex.test(sql)) {
      findings.push({
        tool: 'sanity',
        severity: 'critical',
        status: 'new',
        ruleId: 'sanity/supabase-rls-missing',
        file,
        evidence: `Table ${tableName} appears without complete RLS setup (ENABLE RLS + POLICY).`,
        recommendation: `Add ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY and at least one CREATE POLICY.`,
      });
    }
  }

  return findings;
}

let files = [];
try {
  files = (await readdir(migrationsDir)).filter((x) => x.endsWith('.sql'));
} catch {
  files = [];
}

const findings = [];
for (const file of files) {
  const absolute = path.join(migrationsDir, file);
  const sql = await readFile(absolute, 'utf8');
  findings.push(...findTablesWithoutRls(sql, path.join('supabase/migrations', file)));
}

const report = {
  generatedAt: new Date().toISOString(),
  findings,
};

await writeFile('supabase-sanity-report.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (findings.length > 0) {
  process.exit(1);
}
