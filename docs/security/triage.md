# Security Triage Workflow

This workflow applies to findings produced by `.github/workflows/security-baseline.yml` and artifacts `security-report.json` + `security-summary.md`.

## SLA (blocking findings)

- Scope: findings with `status: new` and `severity: high|critical`.
- Initial triage SLA: **2 business days** from first failed `security-baseline` run.

## Triage steps

1. Open the latest CI artifacts and identify each blocking finding.
2. Assign owner and due date (within SLA).
3. Classify each finding as:
   - **TP (True Positive)**: valid vulnerability.
   - **FP (False Positive)**: tool error or non-exploitable signal.
   - **Accepted Risk**: known risk accepted temporarily with explicit expiry.
4. Record decision and evidence in PR (or linked issue) with rule ID, file/line, and rationale.
5. Apply action by classification:
   - **TP** → remediate and re-run `security-baseline`.
   - **FP** → propose narrow rule tuning / allowlist entry per `allowlist-policy.md`.
   - **Accepted Risk** → add time-boxed exception per `allowlist-policy.md` and create follow-up remediation task.

## Rollout plan

- **Week 1 — Warn mode**: set `SECURITY_GATE_MODE=warn`; triage all `high|critical` findings without merge blocking.
- **Week 2 — Enforce mode**: set `SECURITY_GATE_MODE=enforce`; block merges on `new high|critical` findings.
- **Week 3 — Calibration**: reduce noise by refining Semgrep/Gitleaks rules and reviewing expiring allowlist exceptions.

## Exit criteria per finding

- TP fixed and check passes, or
- FP documented and rule adjusted, or
- Accepted Risk approved with expiration + owner.
