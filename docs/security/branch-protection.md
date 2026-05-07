# Branch Protection: Security Baseline Required

To enforce the security gate defined in `.github/workflows/security-baseline.yml`, configure branch protection on the default branch (`main`) so merge is blocked unless the required check passes.

## Required status check

- **`security-baseline`** (job name)

## GitHub UI steps

1. Go to **Settings → Branches → Branch protection rules**.
2. Edit the rule for `main` (or create one if it does not exist).
3. Enable **Require status checks to pass before merging**.
4. Add **`security-baseline`** as a required check.
5. Save changes.

## Optional CLI (requires admin permissions)

```bash
gh api \
  --method PUT \
  repos/:owner/:repo/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks.strict=true \
  -F required_status_checks.contexts[]='security-baseline' \
  -f enforce_admins=true \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -f restrictions=
```

If repository permissions do not allow automated branch protection updates, keep this file as the source-of-truth policy and apply settings manually.
