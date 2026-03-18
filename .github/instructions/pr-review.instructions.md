---
applyTo: "**"
---

# Pull Request Review Instructions

## Review focus
- Check whether the change matches the stated scope.
- Flag unrelated file changes.
- Prefer small, auditable diffs.
- Call out hidden risk, not just syntax issues.

## Architecture review
- Verify layer boundaries are respected.
- Flag movement of logic across `src/core`, `src/modules`, `src/app`, and `src/infra`.
- Highlight possible circular dependency risk.

## Critical review
When relevant, explicitly review impact on:
- authentication
- tenant isolation
- authorization
- protected routes
- request context
- observability
- runtime contracts
- security-sensitive config

## Validation review
- Check whether tests are needed for behavior changes.
- Flag missing validation for critical paths.
- Call out routes or contracts that may need verification.

## Review behavior
- Prefer precise, actionable comments.
- Separate nits from blocking issues.
- If risk exists, explain why it matters.
