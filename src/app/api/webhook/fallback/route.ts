/**
 * POST /api/webhook/fallback (compat legada)
 *
 * Adapter fino: delega integralmente para o handler canônico em
 * `src/app/api/webhooks/whatsapp/fallback/route.ts`. Mantido porque o
 * console Twilio (Fallback URL) aponta para esta URL pública.
 * Sem lógica duplicada: mesma referência de função, mesma verificação
 * de assinatura Twilio e mesma resposta TwiML 200.
 *
 * Nota: `runtime` é declarado como literal (não re-exportado) porque o
 * Next.js exige route segment config estaticamente analisável.
 */
export const runtime = 'nodejs';

export { POST } from '../../webhooks/whatsapp/fallback/route';
