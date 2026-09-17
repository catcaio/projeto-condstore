/**
 * POST /api/whatsapp/status (compat legada)
 *
 * Adapter fino: delega integralmente para o handler canônico em
 * `src/app/api/webhooks/whatsapp/status/route.ts`. Mantido porque o
 * console Twilio ("STATUS CALLBACK URL") aponta para esta URL pública.
 * Sem lógica duplicada: mesma referência de função, mesmo xmlAck,
 * mesma verificação de assinatura, rate limit e delivery status service.
 */
export { POST } from '../../webhooks/whatsapp/status/route';
