---
name: verify-implementation
description: Verify an implementation with commands executed in the bound workspace and classify evidence conservatively.
---

# Verify Implementation

Review the real OpenHands result and repository diff. Run only checks required by the approved plan in the bound workspace. Report each command, exit code, duration and relevant sanitized output. Classify missing infrastructure or credentials as `BLOCKED`, failed commands as `FAIL`, and successful evidence as `PASS`.

Do not alter source code, credentials, repository settings, CI configuration, pull requests, deployment or production data during verification.
