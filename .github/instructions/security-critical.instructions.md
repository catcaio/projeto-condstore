---
applyTo: "src/**"
---

# Security-Critical Instructions

## Critical areas
Treat changes involving the following as high risk:
- authentication
- tenant isolation
- authorization
- protected API routes
- request context
- runtime contracts
- security-sensitive config

## Required behavior
- Prefer the smallest safe diff.
- Do not change behavior in critical flows without explicit justification.
- Do not relax guards, checks, or validation.
- Do not remove security-related code without explaining impact.
- Do not change tenant scoping logic without calling out data-isolation risk.

## Validation requirements
- Highlight impact on auth, tenant, and security before proposing changes.
- Suggest or require tests for critical behavior changes.
- Call out protected routes that may need guard verification.
- Flag any runtime contract changes explicitly.

## Review expectations
- These changes should be treated as review-heavy.
- Avoid broad refactors in critical files.
- Keep PRs narrow and easy to audit.
