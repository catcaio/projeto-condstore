/**
 * Twilio-specific configuration.
 * Centralizes all Twilio-related settings and credentials.
 */

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  webhookTimeout: number; // ms
  maxRetries: number;
  signatureValidationEnabled: boolean;
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

export const twilioConfig: TwilioConfig = {
  accountSid: getEnv('TWILIO_ACCOUNT_SID', 'dev_account_sid'),
  authToken: getEnv('TWILIO_AUTH_TOKEN', 'dev_auth_token'),
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+5511999999999',
  webhookTimeout: parseInt(process.env.TWILIO_WEBHOOK_TIMEOUT_MS || '10000', 10),
  maxRetries: parseInt(process.env.TWILIO_MAX_RETRIES || '3', 10),
  signatureValidationEnabled: process.env.TWILIO_SIGNATURE_VALIDATION_ENABLED !== 'false',
};

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
