/**
 * POST /api/webhook/stripe (compat legada)
 *
 * Adapter fino: delega integralmente para o handler canônico em
 * `src/app/api/webhooks/stripe/route.ts`. Mantido para não quebrar a URL
 * pública configurada no Dashboard Stripe / `stripe:listen`.
 * Sem lógica duplicada: mesma referência de função, mesmos status codes,
 * mesma verificação de assinatura (raw body), idempotência e tenant resolution.
 *
 * Nota: `runtime` é declarado como literal (não re-exportado) porque o
 * Next.js exige route segment config estaticamente analisável.
 */
export const runtime = 'nodejs';

export { POST } from '../../webhooks/stripe/route';
