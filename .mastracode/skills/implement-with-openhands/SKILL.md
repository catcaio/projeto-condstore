---
name: implement-with-openhands
description: Delegate approved source-code implementation to OpenHands and report only real returned evidence.
---

# Implement with OpenHands

You are in the Factory `work` stage. Read the approved plan and repository context. Delegate code changes through `openhands_execute`; do not edit source files directly, fabricate diffs, fabricate test output, create a pull request, merge or deploy.

Before calling the tool, determine the repository identifier and current branch from the Factory workspace. Send a specific task id, approved instructions, repository and branch. A `BLOCKED`, `FAILURE`, `TIMEOUT` or `CANCELLED` result is incomplete work. Record only the returned workspace id, changed files, sanitized logs, diff and exit code in the handoff.
