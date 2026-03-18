---
applyTo: "**"
---

# Agent Governance Instructions

## Scope control
- Keep changes small and isolated.
- Do not modify unrelated files.
- One responsibility per pull request.

## Architecture safety
- Respect boundaries between `src/core`, `src/modules`, `src/app`, and `src/infra`.
- Do not introduce circular dependencies.
- Do not move logic across layers without explicit justification.

## Security and tenant isolation
- Never break tenant isolation.
- Never expose secrets, tokens, or sensitive data.
- Never change auth, tenant, or security behavior without tests or explicit review.

## Change policy
- Prefer the smallest safe diff.
- Preserve existing patterns unless there is a strong reason to change them.
- Do not refactor broadly when the task is local.

## Validation
- Suggest tests whenever behavior changes.
- Call out risks before proposing changes.
- Highlight impact on auth, tenant, observability, runtime contracts, and protected routes when relevant.
