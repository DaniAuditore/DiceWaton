# Security Allowlist Policy

This policy governs exceptions used by Semgrep/Gitleaks/dependency and sanity checks in the `security-baseline` workflow.

## When an exception is allowed

Allowlist entries are permitted only when all apply:

1. Finding is confirmed **FP** or **temporarily accepted risk**.
2. Scope is minimal (exact rule/path/value; no broad wildcards unless justified).
3. A remediation or review date is defined.

## Required metadata

Each exception MUST include:

- reason (`false_positive` or `accepted_risk`)
- owner (team or individual)
- created date
- expiration date (mandatory)
- reference (PR/issue)

## Expiration policy

- Default maximum validity: **30 days**.
- On expiration, exception is removed or re-approved with fresh evidence.
- Expired exceptions are treated as non-allowlisted findings.

## Approval process

1. Author proposes exception in PR with evidence and metadata.
2. Security owner (or designated maintainer) approves.
3. Merge only after approval and metadata validation.
4. Re-approval required for any extension.

## Guardrails

- Never allowlist unknown `high|critical` findings without explicit accepted-risk approval.
- Prefer fixing root cause over adding exceptions.
- Keep allowlist diff small and auditable.
