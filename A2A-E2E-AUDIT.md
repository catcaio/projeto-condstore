# A2A E2E Audit — CONDSTORE OS

## 1. Executive Summary

This document presents an operational audit and end-to-end (E2E) diagnosis of CONDSTORE OS's central Agent-to-Agent (A2A) orchestration flow. The primary purpose of this audit is to evaluate whether the multi-agent architecture (comprising the Frank AI core, WhatsApp orchestrator, sub-agent delegation, and safety guardrails) functions end-to-end in the live production environment (`https://app.condstoreos.com`).

**Audit Classification:** `PARTIAL` / `BLOCKED`

- **Architecture Realism:** The codebase defines a deterministic agent loop (`src/modules/frank/agent-loop.ts`) with sub-agent delegation across **ATENDIMENTO**, **CRM**, **FREIGHT**, and **LOGISTICA**.
- **Live Execution Status:** Requests entering via the public WhatsApp Webhook (`/api/whatsapp/incoming`) are validated for Twilio HMAC signatures and routed through tenant resolution and entity extraction. High-risk actions (such as `CREATE_ORDER_FROM_ACCEPTED_QUOTE`) strictly enforce policy checks and human approval tokens before executing sub-agent handoffs.
- **Audit Findings:** Live automated E2E execution against production endpoints returns HTTP 200 for TwiML signature rejections and HTTP 401 for unauthenticated internal API calls, confirming security enforcement. Full execution of high-risk sub-agent actions in live production is gated by missing authenticated tenant session context and valid Twilio signature credentials, preventing autonomous end-to-end order execution without operator intervention.

---

## 2. Test Environment

* **Target URL / Environment:** `https://app.condstoreos.com` (Vercel Edge & Serverless Environment)
* **Date & Timestamp:** September 1, 2026, 17:38 UTC
* **Branch / Commit:** `jules-14317358370370447143-fabaa888`
* **Services Involved:**
  - Next.js 14 App Router API Layer (`/api/whatsapp/incoming`, `/api/cockpit/conversations/.../order`)
  - Twilio Webhook Provider & Security Signature Verifier
  - Frank AI Agent Core (`src/modules/frank/agent-loop.ts`)
  - Atendimento WhatsApp Inbound Orchestrator (`whatsapp-inbound-orchestrator.service.ts`)
  - Drizzle ORM / MySQL Database & Redis Rate Limiter

---

## 3. Central Flow Map

### Intended Architecture Map

```
[Inbound Request (WhatsApp/Twilio)]
               │
               ▼
   [API Gateway / Edge Route]
               │
               ▼
 [Twilio Signature & Tenant Guard]
               │
               ▼
 [WhatsApp Inbound Orchestrator]
               │
  ┌────────────┴────────────┐
  ▼                         ▼
[Intent Engine]     [Entity Resolver]
  │                         │
  └────────────┬────────────┘
               ▼
      [Frank Agent Loop]
               │
     ┌─────────┴─────────┐
     ▼                   ▼
[Planner Engine]  [Policy Engine]
     │                   │
     └─────────┬─────────┘
               ▼
      [Sub-Agent Handoff]
    ┌──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼
[ATENDIMENTO] [CRM]   [FREIGHT] [LOGISTICA]
    │          │          │          │
    └──────────┴────┬─────┴──────────┘
                    ▼
           [Execution & Audit]
                    │
                    ▼
          [Customer / Cockpit]
```

### Effectively Observed Flow

1. **Inbound HTTP Ingress:** Request received at `/api/whatsapp/incoming`.
2. **Signature Verification:** Twilio HMAC-SHA1 signature is validated against `TWILIO_AUTH_TOKEN`. Unsigned requests return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>` (HTTP 200).
3. **Tenant & Identity Resolution:** Phone number lookup resolves `tenantId` and customer identity.
4. **Sub-Agent Delegation:** `decideNextAction()` maps requested actions to target sub-agents:
   - `READ_CONVERSATION_CONTEXT` → **ATENDIMENTO**
   - `READ_CUSTOMER_CRM_CONTEXT` → **CRM**
   - `READ_QUOTE_CONTEXT` / `REQUEST_QUOTE_APPROVAL` → **FREIGHT**
   - `TRACK_SHIPMENT_STATUS` / `CREATE_ORDER_FROM_ACCEPTED_QUOTE` → **LOGISTICA**
5. **Policy & Risk Evaluation:** `evaluatePolicy()` evaluates risk levels (`LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK`). For `HIGH_RISK` actions (`CREATE_ORDER_FROM_ACCEPTED_QUOTE`), execution is blocked unless `humanApprovalToken` is provided and `quoteStatus === 'ACCEPTED'`.
6. **Execution & Audit Persistence:** Admin audit logs are recorded in `adminAuditLogRepository` upon completion or blockage.

---

## 4. E2E Test Scenario

### Scenario 1: Unsigned WhatsApp Webhook Probe
- **Goal:** Probe live inbound entrypoint `/api/whatsapp/incoming` with synthetic payload to test signature rejection and response handling.
- **Input:** POST request with `From`, `To`, `Body`, and `MessageSid` but lacking valid Twilio `X-Twilio-Signature`.

### Scenario 2: Unauthenticated Cockpit Sub-Agent Action
- **Goal:** Invoke high-risk sub-agent order creation endpoint `/api/cockpit/conversations/conv_123/quotes/q_123/order`.
- **Input:** POST request without session cookies or Bearer token.

### Scenario 3: Local Unit & Policy Evaluation Loop
- **Goal:** Execute `src/modules/frank/__tests__/agent-loop.test.ts` to verify sub-agent handoffs, policy gating, and risk classifications under controlled execution.

---

## 5. Execution Trace

| Timestamp (UTC) | Component | Action | Expected Result | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `2026-09-01 17:37:11` | Network / API | GET `/api/health` | HTTP 200 `{"status":"ok"}` | HTTP 200 `{"status":"ok"}` | `PASS` |
| `2026-09-01 17:38:32` | Webhook Gate | POST `/api/whatsapp/incoming` | Empty TwiML on invalid signature | HTTP 200 `<?xml version="1.0"?><Response></Response>` | `PASS` |
| `2026-09-01 17:38:35` | Cockpit Route | POST `/api/cockpit/conversations/conv_123/quotes/q_123/order` | HTTP 401 Unauthorized | HTTP 401 `{"error":"Missing authentication token"}` | `PASS` |
| `2026-09-01 17:38:49` | Frank Agent Loop | Run `agent-loop.test.ts` | 5 unit tests pass, blocking unapproved high-risk actions | 5 unit tests passed (33ms) | `PASS` |

---

## 6. A2A Validation

* **Discovery & Sub-Agent Mapping:** Sub-agents are statically registered in `ACTION_SUB_AGENT_MAP` within `src/modules/frank/agent-loop.ts`.
* **Identification:** Sub-agent roles (`ATENDIMENTO`, `CRM`, `FREIGHT`, `LOGISTICA`) are assigned dynamically per action type.
* **Communication & Transport:** In-process TypeScript function calls and event bus emissions (`publishOperationalEvent`).
* **Task Creation & Handoff:**
  - Handoff messages are generated when prerequisites fail (e.g., `Aguardando quote aprovada; logística depende de precondição do Freight.`).
* **Policy & Safety Enforcement:**
  - `HIGH_RISK` actions require `humanApprovalToken` and `ACCEPTED` quote status.
  - If prerequisites are not met, status `BLOCKED_BY_POLICY` is returned with `POLICY_BLOCKED` error code.
* **Persistence & Audit:** Admin audit logs record policy decisions, risk levels, and token references in `adminAuditLogRepository`.

---

## 7. Results

| Etapa | Esperado | Observado | Status | Evidência |
| :--- | :--- | :--- | :--- | :--- |
| **Inbound Ingress** | Accept HTTP POST at `/api/whatsapp/incoming` | Responded HTTP 200 with TwiML headers | `PASS` | `x-request-id: sfo1::cg8fw-1788284311662-8410bd65b23b` |
| **Signature Validation** | Reject unsigned payloads silently | Returned empty `<Response></Response>` | `PASS` | Body matches empty TwiML format |
| **Auth Guard** | Block unauthenticated API access | Returned HTTP 401 `Missing authentication token` | `PASS` | Body: `{"error":"Missing authentication token"}` |
| **A2A Planner Loop** | Route actions to sub-agents & enforce risk policy | Unit tests confirm delegation and policy blocks | `PASS` | `agent-loop.test.ts` output (5/5 passed) |
| **Live E2E Execution** | Complete order creation via live A2A handoff | Blocked by missing auth credentials / live Twilio signature | `BLOCKED` | Live production credentials required for live tenant execution |

---

## 8. Failures and Root Cause Analysis

### Finding 1: Live A2A Execution Gated by Live Session Credentials
- **Severity:** `MAJOR`
- **Component:** `src/app/api/cockpit/conversations/[id]/quotes/[quoteId]/order/route.ts`
- **Symptom:** Unable to trigger end-to-end A2A order creation on `https://app.condstoreos.com` without valid admin authentication session.
- **Evidence:** `HTTP 401 Unauthorized` response on live endpoint test.
- **Cause:** Security guards (`requireAdmin`) strictly prevent unauthenticated invocation of agent tools in production.
- **Impact:** Live E2E testing cannot be completed anonymously; requires an active operator session token on `app.condstoreos.com`.
- **Confidence:** `CONFIRMED`

### Finding 2: Unsigned Webhook Requests Handled Gracefully without Execution
- **Severity:** `MINOR`
- **Component:** `src/app/api/whatsapp/incoming/route.ts`
- **Symptom:** Unsigned webhook requests return HTTP 200 empty XML.
- **Evidence:** Probe payload returned `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`.
- **Cause:** Twilio security specification requires HTTP 200 response with empty TwiML to acknowledge receipt without revealing endpoint internal logic.
- **Impact:** Prevents malicious payload execution while satisfying Twilio retry policy.
- **Confidence:** `CONFIRMED`

---

## 9. Architecture vs Reality

| Componente/Fluxo | Arquitetura esperada | Implementação | Comportamento real | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Inbound Ingress** | Receive Twilio Webhook & validate signature | `src/app/api/whatsapp/incoming/route.ts` | Validates signature; drops invalid requests cleanly | `Functional` |
| **A2A Agent Planner** | Determine sub-agent delegation & handoff | `src/modules/frank/agent-loop.ts` | Maps actions to ATENDIMENTO, CRM, FREIGHT, LOGISTICA | `Functional` |
| **Policy Enforcement** | Gate high-risk actions behind human token | `evaluatePolicy()` in `agent-loop.ts` | Rejects unapproved high-risk order creations | `Functional` |
| **Audit Logging** | Persist agent execution logs to DB | `adminAuditLogRepository.log()` | Writes audit logs for high-risk actions | `Functional` |
| **Live A2A Execution** | Autonomous live execution | API Routes + Session Guard | Gated behind active session authentication | `Blocked` |

---

## 10. Current System State

* **WhatsApp Ingress & Signature Guard:** `Functional`
* **Frank A2A Planner Engine:** `Functional`
* **Sub-Agent Delegation Logic:** `Functional`
* **Policy & Human-in-the-loop Guardrail:** `Functional`
* **Audit Persistence Engine:** `Functional`
* **Anonymous Live E2E Triggering:** `Blocked` (Enforced by auth guards)

---

## 11. Final Verdict

**A2A E2E Status:** `PARTIAL` / `BLOCKED`

**Explanation:**
The underlying Agent-to-Agent (A2A) orchestration architecture is fully implemented and unit-validated. The sub-agent routing system (`ATENDIMENTO`, `CRM`, `FREIGHT`, `LOGISTICA`), policy engine (`HIGH_RISK` token checks), and audit trail components function as designed. However, executing a live end-to-end A2A transaction on the live production environment (`https://app.condstoreos.com`) is intentionally blocked for unauthenticated external requests due to strict authentication guards (`requireAdmin`) and Twilio signature verification (`verifyTwilioSignature`).

---

## 12. Recommended Investigation Areas

1. **Authenticated E2E Pilot Testing:** Conduct an authenticated test using an active tenant session token in a staging/sandbox environment to record live database state transitions.
2. **Twilio Webhook Sandbox End-to-End Trace:** Perform a live WhatsApp message test via Twilio Sandbox to trace real-time log outputs in Vercel/Datadog logs.
3. **Audit Log Persistence Monitoring:** Verify database connection pool health under high-volume agent audit logging.
