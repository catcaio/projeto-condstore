/**
 * POST /api/whatsapp/incoming (compat legada)
 *
 * Adapter fino: delega integralmente para o handler canônico em
 * `src/app/api/webhooks/whatsapp/incoming/route.ts`. Mantido porque o
 * console Twilio ("WHEN A MESSAGE COMES IN") aponta para esta URL pública.
 * Sem lógica duplicada: mesma referência de função, mesmo TwiML,
 * mesma verificação de assinatura, rate limit e resolução de tenant.
 *
 * Nota: `runtime`/`dynamic` são declarados como literais (não re-exportados)
 * porque o Next.js exige route segment config estaticamente analisável.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { POST } from '../../webhooks/whatsapp/incoming/route';
