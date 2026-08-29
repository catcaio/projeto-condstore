---
name: prepare-release
description: Assemble release-readiness evidence from an approved pull request, CI and smoke tests without shipping automatically.
---

# Prepare Release

Gather the pull request URL, head commit, CI run URL and smoke-test results. Confirm that architecture, security and business approvals are recorded through the Factory's persisted approval and transition mechanisms. Report readiness as `PASS`, `FAIL`, `BLOCKED` or `NOT_VERIFIED` with a concrete next action.

Do not merge, deploy, alter production data, rotate credentials or bypass approvals. A release remains blocked until every required real artifact is available.
