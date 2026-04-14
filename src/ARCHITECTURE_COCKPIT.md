# Cockpit — Architecture Reference

> Last updated: 2026-02. Branch: `feat/cockpit-ui`.
> Describes the auth, data, and rendering architecture for `/cockpit`.

---

## 1. Authentication Flow

```
Browser                    Next.js                    JWT / Cookie
  │                           │                            │
  ├─ POST /api/auth/login ───►│                            │
  │   { email, password }     │                            │
  │                           ├─ verifyPassword(hash)      │
  │                           ├─ createSessionToken() ────►│
  │                           │   SignJWT { sub, email,    │
  │                           │   tenantId, role }         │
  │                           │   alg: HS256, exp: 8h      │
  │                           │◄───────────────── token    │
  │◄── Set-Cookie: ──────────►│                            │
  │    condstore_session=<jwt>                             │
  │    HttpOnly; SameSite=Lax; Path=/                      │
  │    secure=true (production only)                       │
  │                           │                            │
  ├─ GET /cockpit ───────────►│                            │
  │   Cookie: condstore_session=<jwt>                      │
  │                           ├─ middleware.ts             │
  │                           │   jwtVerify(token, secret) │
  │                           │   → inject headers         │
  │                           │   → RBAC check             │
  │                           ├─ NextResponse.next()       │
  │◄── 200 /cockpit ─────────│                            │
```

**Key files:**
- `src/app/api/auth/login/route.ts` — credential verification, cookie setting
- `src/infra/auth/session.ts` — `createSessionToken()`, `COOKIE_NAME`, `getSecret()`
- `src/infra/auth/password.ts` — scrypt hash + timing-safe compare
- `src/middleware.ts` — JWT verification, header injection, RBAC enforcement

**Cookie:** name `condstore_session`, defined once in `src/infra/auth/session.ts`.
**Secret:** `AUTH_SECRET` env var (HS256). A dev-only fallback is accepted only when `NODE_ENV=development`; every other runtime fails fast if the secret is missing or uses a forbidden fallback value.

---

## 2. Middleware Responsibilities

**File:** `src/middleware.ts`

**Execution order for every non-public, non-static request:**

```
1. DEV_BYPASS_COCKPIT check   → skip auth for /cockpit UI routes (dev only, never /api)
2. isPublicPath()             → skip auth for /login, /api/auth/login, /api/health, etc.
3. Cookie read                → read condstore_session
4. jwtVerify()                → verify signature + expiry with AUTH_SECRET
5. Payload validation         → require sub (userId) + tenantId; reject otherwise
6. isRoleAllowed()  [RBAC]    → evaluate RBAC_RULES top-to-bottom
7. Header injection           → x-user-id, x-user-email, x-tenant-id, x-user-role
8. addSecurityHeaders()       → X-Frame-Options, X-Content-Type-Options, etc.
```

**RBAC rules (first match wins):**

| Prefix | Allowed roles |
|--------|--------------|
| `/cockpit/tenants` | `admin` |
| `/cockpit` | `admin`, `manager` |
| *(everything else)* | any authenticated role |

**Responses on failure:**

| Condition | API routes (`/api/*`) | UI routes |
|-----------|----------------------|-----------|
| No / invalid token | `401 { error: "Unauthorized" }` | Redirect → `/login` |
| Insufficient role | `403 { error: "Forbidden" }` | Redirect → `/cockpit` |

**Matcher:** all routes except `_next/static`, `_next/image`, `favicon.ico`, and static asset extensions.

---

## 3. Metrics Flow

```
Browser (CockpitMetrics.tsx)
  │
  ├─ GET /api/cockpit/metrics
  │   Cookie: condstore_session  (sent automatically by browser)
  │
  ▼
src/middleware.ts
  ├─ JWT verified → x-tenant-id injected into request headers
  │
  ▼
src/app/api/cockpit/metrics/route.ts
  ├─ Read x-tenant-id header  (never from query/body)
  ├─ Redis GET  cockpit:metrics:{tenantId}
  │   ├─ HIT  → return cached JSON  (Cache-Control: private, max-age=30)
  │   └─ MISS → continue to DB
  ├─ Promise.all([
  │     messageRepository.getMetricsToday(tenantId),    // messages table
  │     simulationRepository.countToday(tenantId),      // simulations table
  │   ])
  ├─ Build payload:
  │     { mensagensHoje, cotacoesHoje, pedidosHoje: 0*, erros24h: 0* }
  ├─ Redis SET  cockpit:metrics:{tenantId}  TTL=30s  (fire-and-forget)
  └─ return JSON  (Cache-Control: private, max-age=30)
```

> *`pedidosHoje` and `erros24h` return `0` — `orders` and `error_log` tables not yet implemented.

**Tenant isolation:** `x-tenant-id` is set exclusively by middleware from the verified JWT claim.
A malicious request cannot forge it — Next.js middleware overwrites any incoming value.
All repository queries receive `tenantId` as an explicit parameter and scope their SQL `WHERE` clause accordingly.

---

## 4. UI Refresh Logic

**Component:** `src/app/cockpit/_components/CockpitMetrics.tsx`

```
Mount
  │
  ├─ fetchMetrics(showSkeletons=false)
  │   loading is already true (useState initial value)
  │   → renders 4 × MetricCardSkeleton (animate-pulse)
  │   fetch GET /api/cockpit/metrics
  │   ├─ ok   → setData(json), setError(''), setLoading(false)
  │   └─ err  → setError(message),           setLoading(false)
  │
  ├─ setInterval(30_000) → fetchMetrics(showSkeletons=false)
  │   Silent refresh: setLoading stays false, data updates in place, no skeleton flash
  │
  └─ unmount → clearInterval(id)   ← no memory leak

Manual "↻ Atualizar" button
  └─ onClick: fetchMetrics(showSkeletons=true)
      → setLoading(true) → skeleton grid shown
      → fetch → same flow as initial load
      button disabled while loading=true
```

**Render states:**

| Condition | UI |
|-----------|-----|
| `loading === true` | 4 × `<MetricCardSkeleton>` (animate-pulse, identical dimensions) |
| `loading === false, error === ''` | 4 × `<MetricCard>` with real numeric values |
| `loading === false, error !== ''` | Compact red one-line banner; cards render with `value=0` |

---

## 5. Multi-Tenant Isolation Points

| Layer | Mechanism | Location |
|-------|-----------|----------|
| JWT signing | `tenantId` embedded in token, signed with `AUTH_SECRET` | `src/infra/auth/session.ts` |
| Header injection | Middleware extracts `tenantId` from verified JWT → sets `x-tenant-id` | `src/middleware.ts` |
| API routes | Read `x-tenant-id` from request headers only (never query/body) | All `/api/cockpit/*` handlers |
| DB queries | `tenantId` passed as explicit parameter; SQL `WHERE tenant_id = ?` | `src/infra/repositories/` |
| Redis cache | Key namespaced: `cockpit:metrics:{tenantId}` | `src/app/api/cockpit/metrics/route.ts` |
| RBAC | Role claim extracted from JWT (same tenant context as tenantId) | `src/middleware.ts` |

**Attack surface note:** A client cannot inject a forged `x-tenant-id` header.
Next.js middleware always overwrites that header with the JWT-verified value before the request reaches any route handler.

---

## 6. Component Architecture

```
src/app/cockpit/
├── layout.tsx                  Server Component — shell: Sidebar + CommandBar + <main>
├── page.tsx                    Server Component — mock chrome (Atividade, Status)
└── _components/
    ├── command-bar.tsx         Client Component — search bar + system status dot
    ├── sidebar.tsx             Client Component — nav + user footer (fetches /api/auth/me)
    ├── CockpitMetrics.tsx      Client Component — smart: owns fetch, interval, state
    ├── MetricCard.tsx          Presentational — pure, no hooks; colorVariant='error' support
    └── MetricCardSkeleton.tsx  Presentational — animate-pulse placeholder, matches MetricCard dims
```

**`'use client'` boundary:** `command-bar.tsx`, `sidebar.tsx`, `CockpitMetrics.tsx`.
`layout.tsx` and `page.tsx` are Server Components — no client bundle weight.
`MetricCard.tsx` and `MetricCardSkeleton.tsx` are purely presentational and render inside the `CockpitMetrics` client boundary.

---

## 7. API Surface

| Method | Route | Auth required | Description |
|--------|-------|--------------|-------------|
| `POST` | `/api/auth/login` | None (public) | Verify credentials, issue `condstore_session` cookie |
| `POST` | `/api/auth/logout` | None (public) | Clear `condstore_session` cookie |
| `GET` | `/api/auth/me` | Session (any role) | Return `{ userId, email, tenantId, role }` from JWT headers |
| `GET` | `/api/cockpit/metrics` | Session (any role) | Today's tenant metrics, Redis-cached 30s |

All authenticated routes rely on middleware-injected headers (`x-user-id`, `x-tenant-id`, etc.) — no client-supplied auth parameters are trusted.
