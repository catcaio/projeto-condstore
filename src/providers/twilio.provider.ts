import { resolveTwilioConfig, extractPhoneNumber as extractPhone, formatPhoneNumber } from '../config/twilio.config';
import { ErrorCode, ProviderError } from '../infra/errors';
import { logger } from '../infra/logger';
import { tenantRepository } from '../infra/repositories/tenant.repository';
import { structuredLogger } from '../infra/log/logger';
import { withCircuitBreaker } from '@/lib/resilience/circuit-breaker';

export interface IncomingMessage {
  from: string;
  body: string;
  messageSid: string;
  timestamp: Date;
}

export interface OutgoingMessage {
  to: string;
  body: string;
}

export interface TwilioSendSuccess {
  ok: true;
  sid: string;
  status: string | null;
  to: string;
  from: string;
  attempts: number;
  providerStatusCode: number;
}

export interface TwilioSendFailure {
  ok: false;
  errorCode: 'TENANT_NOT_FOUND' | 'OUTBOUND_DISABLED' | 'INCIDENT_MODE' | 'TWILIO_API_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  to: string;
  attempts: number;
  providerStatusCode?: number;
  providerBody?: string;
  retryable?: boolean;
}

export type TwilioSendResult = TwilioSendSuccess | TwilioSendFailure;

export interface TwilioMessageLookupSuccess {
  ok: true;
  sid: string;
  from: string;
  to: string;
  status: string | null;
  providerStatusCode: number;
}

export interface TwilioMessageLookupFailure {
  ok: false;
  message: string;
  providerStatusCode?: number;
  providerBody?: string;
}

export type TwilioMessageLookupResult = TwilioMessageLookupSuccess | TwilioMessageLookupFailure;

export interface TwilioWebhookPayload {
  From: string;
  Body: string;
  MessageSid: string;
  [key: string]: string;
}

class TwilioProvider {
  /**
   * Parse incoming webhook payload from Twilio.
   */
  parseIncomingMessage(payload: TwilioWebhookPayload): IncomingMessage {
    try {
      return {
        from: extractPhone(payload.From),
        body: payload.Body.trim(),
        messageSid: payload.MessageSid,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to parse Twilio webhook payload', error as Error, { payload });
      throw new ProviderError(
        ErrorCode.TWILIO_API_ERROR,
        'Invalid Twilio webhook payload',
        { payload }
      );
    }
  }

  /**
   * Generate TwiML response for webhook.
   */
  generateTwiMLResponse(message: string): string {
    const escaped = this.escapeXml(message);
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escaped}</Message>
</Response>`;
  }

  /**
   * Escape XML special characters.
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Send message via Twilio API.
   * Modificado para receber tenantId e resolver config dinamicamente.
   */
  async sendMessageDetailed(tenantId: string, message: OutgoingMessage, maxRetriesParam?: number): Promise<TwilioSendResult> {
    const config = await resolveTwilioConfig(tenantId);
    const maxRetries = maxRetriesParam ?? config.maxRetries;
    let lastError: Error | null = null;
    let lastProviderStatusCode: number | undefined;
    let lastProviderBody: string | undefined;

    const tenant = await tenantRepository.getTenantById(tenantId);
    if (!tenant) {
      logger.error('Failed to send message via Twilio: Tenant not found', new Error('Tenant not found'), { tenantId });
      return {
        ok: false,
        errorCode: 'TENANT_NOT_FOUND',
        message: 'Tenant not found',
        to: message.to,
        attempts: 0,
      };
    }

    if (!tenant.outboundEnabled) {
      structuredLogger.warn('twilio_outbound_blocked_by_kill_switch', {
        tenantId,
        to: message.to,
        eventType: 'twilio_outbound_blocked',
      });
      return {
        ok: false,
        errorCode: 'OUTBOUND_DISABLED',
        message: 'Outbound is disabled for this tenant',
        to: message.to,
        attempts: 0,
      };
    }

    if (tenant.incidentMode) {
      structuredLogger.warn('twilio_outbound_blocked_by_incident_mode', {
        tenantId,
        to: message.to,
        eventType: 'twilio_outbound_blocked',
      });
      return {
        ok: false,
        errorCode: 'INCIDENT_MODE',
        message: 'Tenant is in incident mode',
        to: message.to,
        attempts: 0,
      };
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(
                `${config.accountSid}:${config.authToken}`
              ).toString('base64')}`,
            },
            body: new URLSearchParams({
              From: config.phoneNumber,
              To: formatPhoneNumber(message.to),
              Body: message.body,
            }),
            signal: AbortSignal.timeout(config.webhookTimeout),
          }
        );

        const duration = Date.now() - startTime;
        logger.http('POST', 'twilio/Messages', response.status, duration);

        if (!response.ok) {
          const errorBody = await response.text();
          lastProviderStatusCode = response.status;
          lastProviderBody = errorBody;
          throw new ProviderError(
            ErrorCode.TWILIO_API_ERROR,
            `Twilio API error: ${response.status}`,
            { status: response.status, body: errorBody, to: message.to },
            response.status >= 500 // Only retry on server errors
          );
        }

        const responseJson = await response.json() as { sid?: string; status?: string | null };

        logger.info('Message sent successfully via Twilio', {
          to: message.to,
          messageSid: responseJson.sid,
        });

        return {
          ok: true,
          sid: responseJson.sid ?? '',
          status: responseJson.status ?? null,
          to: message.to,
          from: config.phoneNumber,
          attempts: attempt + 1,
          providerStatusCode: response.status,
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries && error instanceof ProviderError && error.isRetryable) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.warn(`Twilio API call failed, retrying in ${delay}ms`, { attempt, to: message.to }, error);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    logger.error('Failed to send message via Twilio after retries', lastError!, { to: message.to });
    return {
      ok: false,
      errorCode: lastError instanceof ProviderError ? 'TWILIO_API_ERROR' : 'UNKNOWN_ERROR',
      message: lastError?.message ?? 'Unknown Twilio error',
      to: message.to,
      attempts: maxRetries + 1,
      providerStatusCode: lastProviderStatusCode,
      providerBody: lastProviderBody,
      retryable: lastError instanceof ProviderError ? lastError.isRetryable : false,
    };
  }

  async sendMessage(tenantId: string, message: OutgoingMessage, maxRetriesParam?: number): Promise<boolean> {
    const result = await this.sendMessageDetailed(tenantId, message, maxRetriesParam);
    return result.ok;
  }

  async fetchMessageBySid(tenantId: string, messageSid: string): Promise<TwilioMessageLookupResult> {
    const config = await resolveTwilioConfig(tenantId);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages/${messageSid}.json`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${config.accountSid}:${config.authToken}`
          ).toString('base64')}`,
        },
        signal: AbortSignal.timeout(config.webhookTimeout),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        ok: false,
        message: `Twilio message lookup failed: ${response.status}`,
        providerStatusCode: response.status,
        providerBody: errorBody,
      };
    }

    const message = await response.json() as {
      sid?: string;
      from?: string;
      to?: string;
      status?: string | null;
    };

    return {
      ok: true,
      sid: message.sid ?? messageSid,
      from: extractPhone(message.from ?? ''),
      to: extractPhone(message.to ?? ''),
      status: message.status ?? null,
      providerStatusCode: response.status,
    };
  }
}

// Export singleton instance wrapped with circuit breaker
export const twilioProvider = withCircuitBreaker('twilio', new TwilioProvider());
