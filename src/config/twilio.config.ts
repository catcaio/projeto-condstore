import { secretResolver } from '../infra/security/secret-resolver';
import { logger } from '../infra/logger';

export interface TwilioConfigResolved {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  webhookTimeout: number;
  maxRetries: number;
  signatureValidationEnabled: boolean;
  webhookBaseUrl: string;
}

/**
 * Extract phone number from Twilio's "whatsapp:+5511987654321" format.
 */
export function extractPhoneNumber(twilioFrom: string): string {
  return twilioFrom.replace('whatsapp:', '').trim();
}

/**
 * Format phone number to Twilio's WhatsApp format.
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  return `whatsapp:+${cleaned}`;
}

export async function resolveTwilioConfig(tenantId: string): Promise<TwilioConfigResolved> {
  // Resolve Account SID -> fallback to process.env.TWILIO_ACCOUNT_SID
  // Actually, wait, the prompt asks for TWILIO_ACCOUNT_SID to be "read-only, mascarado". So we might not store it in secret if it's identical per tenant, or maybe we do. We'll try to resolve it anyway. Wait, if it's read-only, it means we don't allow rotation in UI, but we could allow overriding in DB if we want? Read-only means they can't change it. So we just resolve it from ENV?
  // Let's allow overriding in DB if it exists, else ENV. Let's just use secretResolver for all.

  const accountSid = await secretResolver.getValue(tenantId, 'twilio', 'TWILIO_ACCOUNT_SID', 'TWILIO_ACCOUNT_SID');
  const authToken = await secretResolver.getValue(tenantId, 'twilio', 'TWILIO_AUTH_TOKEN', 'TWILIO_AUTH_TOKEN');

  // Phone number (read-only)
  const phoneNumber = await secretResolver.getValue(tenantId, 'twilio', 'TWILIO_PHONE_NUMBER', 'TWILIO_WHATSAPP_NUMBER');

  // Webhook Base URL (read-only)
  let webhookBaseUrl: string;
  try {
    webhookBaseUrl = await secretResolver.getValue(
      tenantId,
      'twilio',
      'TWILIO_WEBHOOK_BASE_URL',
      'TWILIO_WEBHOOK_BASE_URL'
    );
  } catch {
    webhookBaseUrl = await secretResolver.getValue(
      tenantId,
      'twilio',
      'TWILIO_WEBHOOK_BASE_URL',
      'APP_BASE_URL'
    );
  }

  return {
    accountSid,
    authToken,
    phoneNumber,
    webhookBaseUrl,
    webhookTimeout: parseInt(process.env.TWILIO_WEBHOOK_TIMEOUT_MS || '10000', 10),
    maxRetries: parseInt(process.env.TWILIO_MAX_RETRIES || '3', 10),
    signatureValidationEnabled: process.env.TWILIO_SIGNATURE_VALIDATION_ENABLED !== 'false',
  };
}
