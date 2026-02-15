/**
 * Twilio WhatsApp provider.
 * Handles all Twilio API interactions with retry logic and error handling.
 */

import { twilioConfig, extractPhoneNumber as extractPhone } from '../config/twilio.config';
import { ErrorCode, ProviderError } from '../infra/errors';
import { logger } from '../infra/logger';

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
   * This is what Twilio expects as a response to send messages back.
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
   * Send message via Twilio API (for proactive messaging, not webhook responses).
   * This is useful for sending messages outside of the webhook flow.
   */
  async sendMessage(message: OutgoingMessage, maxRetries: number = twilioConfig.maxRetries): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(
                `${twilioConfig.accountSid}:${twilioConfig.authToken}`
              ).toString('base64')}`,
            },
            body: new URLSearchParams({
              From: twilioConfig.phoneNumber,
              To: `whatsapp:+${message.to}`,
              Body: message.body,
            }),
            signal: AbortSignal.timeout(twilioConfig.webhookTimeout),
          }
        );

        const duration = Date.now() - startTime;
        logger.http('POST', 'twilio/Messages', response.status, duration);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new ProviderError(
            ErrorCode.TWILIO_API_ERROR,
            `Twilio API error: ${response.status}`,
            { status: response.status, body: errorBody, to: message.to },
            response.status >= 500 // Only retry on server errors
          );
        }

        logger.info('Message sent successfully via Twilio', {
          to: message.to,
          messageSid: (await response.json()).sid,
        });

        return true;
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
    return false;
  }
}

// Export singleton instance
export const twilioProvider = new TwilioProvider();
