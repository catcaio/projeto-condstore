# CONDSTORE OS - Cockpit Routes Map

This document defines the canonical route architecture for the Condstore OS public and administrative interfaces.

## 🟢 Public Routes

| Route | Objective | Auth | Data Source |
|---|---|---|---|
| `/home` | Marketing & Institutional Landing Page | Public | Static / CMS |
| `/cotacao` | Public freight quotation engine | Public | `api/public/cotacao` |
| `/login` | Client authentication portal | Public | Supabase Auth |
| `/login/staff` | Employee & Admin authentication portal | Public | Supabase Auth (SSO/MFA) |
| `/docs` | Public API & Integration Documentation | Public | Static Markdown/MDX |

## 🟣 Cockpit (Admin Operations Console)

**Base path:** `/cockpit/`

### Operations
| Route | Objective | Auth | Data Source |
|---|---|---|---|
| `/status` | **Canonical** system health overview (Go/No-Go) | Super Admin | `api/cockpit/status` |
| `/status/audit` | Platform audit logs and access history | Super Admin | `auditService` |
| `/strategic-facts` | *[Pending PR #2]* LGPD-first operational registry | Super Admin | `facts.service` |

### Domine (Core Logistics)
| Route | Objective | Auth | Data Source |
|---|---|---|---|
| `/domine` | Logistics engine overview and processors | Super Admin | `domineService` |
| `/domine/dlq` | Dead Letter Queue management for failed events | Super Admin | `dlqRepository` |
| `/domine/health` | Deep health checks for Domine sub-systems | Super Admin | `domineHealth` |

### Settings & Infrastructure
| Route | Objective | Auth | Data Source |
|---|---|---|---|
| `/settings/security` | Key management, IP whitelisting, Rate Limits | Super Admin | `securityService` |
| `/settings/knowledge` | RAG & Vector DB collections management | Super Admin | `knowledgeService` |

## 🔵 Tenant Dashboard (Future)

| Route | Objective | Auth | Data Source |
|---|---|---|---|
| `/dashboard` | Tenant-specific operational overview (Placeholder) | Tenant User | TBD |

---
*Note: Any routes not listed above within `/cockpit/` (e.g., `/cockpit/system-status`) are considered orphans and will be redirected to their canonical counterparts.*
