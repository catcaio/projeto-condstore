---
applyTo: "src/**"
---

# Safe Implementation Instructions

## Change scope
- Prefer the smallest safe diff.
- Do not expand scope beyond the stated task.
- Avoid touching unrelated files.
- Keep one responsibility per change.

## Architecture discipline
- Respect boundaries between `src/core`, `src/modules`, `src/app`, and `src/infra`.
- Do not move logic across layers without explicit justification.
- Do not introduce circular dependencies.
- Reuse existing patterns before introducing new ones.

## Behavior changes
- Do not change behavior silently.
- Call out user-visible, operational, or security impact before changing behavior.
- Be explicit when a change affects contracts, routes, or data flow.

## Safety rules
- Avoid broad refactors when solving a local problem.
- Preserve tenant isolation and auth guarantees.
- Do not weaken validation, guards, or error handling.
- Prefer auditable and reversible changes.

## Validation
- Suggest tests when behavior changes.
- Call out missing coverage in critical flows.
- Highlight follow-up verification needed after implementation.
