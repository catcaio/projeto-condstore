# Repositories Lineage Audit

This document serves as proof of normalization for the **catcaio/projeto-condstore** project.

## 1. Canonical Repository
**Path:** `C:\repos\projeto-condstore`
**Status:** **ACTIVE / CANONICAL**
**Tech Stack:** Next.js 16.1.6 (Turbopack), Drizzle ORM, Multi-tenant Architecture.
**Evidence:** Contains the latest security hardening (403 boundaries), strict TypeScript build gate (`tsconfig.build.json`), and full infrastructure for tenant-scoped message processing.

---

## 2. Comparison Metrics (Evidence)

| Repository Source | Structure Type | Tech Stack | Status | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **projeto-condstore** (Local) | App Router (Next.js) | v16.1.6 (Turbo) | Canonical | **Keep** |
| **lojacond-frete-automacao-main** | App Router (Next.js) | Next.js (Early) | Prototype | **Legacy** |
| **projeto-cond-main** | Client/Server Split | Express/Vite POC | POC | **Archive** |

### A. lojacond-frete-automacao-main
- **Divergence:** Missing `src/infra/auth/session.ts` improvements and `src/app/api/webhook/route.ts` security validations.
- **Verdict:** This is an earlier snapshot of the current architecture. All critical logic is already present and more advanced in the canonical repo.

### B. projeto-cond-main
- **Divergence:** Uses a completely different `client`/`server`/`shared` structure. It was likely a Proof of Concept for the initial freight engine.
- **Verdict:** POC only. Not related to the current production-ready Next.js stack.

---

## 3. Migration and Integration
- **Missing Features:** No missing critical logic was found in the alternative repositories that wasn't already implemented or superseded in `projeto-condstore`.
- **Legacy Components:** Any older controllers found in `projeto-condstore` have been moved to `src/legacy/` to maintain build integrity while preserving history.

---

## 4. Final Confirmation
Only `C:\repos\projeto-condstore` shall be used for development and production. All other clones or extractions in `Downloads` or `temp` directories are for historical reference only and should be considered **STALE**.

**Current SHA:** `da477a61463e6c62ca2b69289608d2e902f009fe`
**Branch:** `chore/typecheck-gate`
