/**
 * Input Validation Layer.
 * Dedicated validation functions for incoming data.
 * Keeps validation logic out of the engine and controllers.
 */

import { BusinessError, ErrorCode } from '../infra/errors';

const CEP_REGEX = /^\d{8}$/;
const MAX_MESSAGE_LENGTH = 500;
// Control characters except newline and tab
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Validate CEP format.
 * Must be exactly 8 digits.
 */
export function validateCEP(cep: string): string {
    const cleaned = cep.replace(/\D/g, '');

    if (!CEP_REGEX.test(cleaned)) {
        throw new BusinessError(
            ErrorCode.VALIDATION_ERROR,
            `Invalid CEP format: "${cep}". Expected 8 digits (e.g., 01001000).`,
            { cep }
        );
    }

    // Reject obviously invalid ranges (00000000)
    if (cleaned === '00000000') {
        throw new BusinessError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid CEP: 00000000 is not a valid postal code.',
            { cep: cleaned }
        );
    }

    return cleaned;
}

/**
 * Validate numeric input (quantity).
 * Must be a positive integer within bounds.
 */
export function validateQuantity(value: unknown): number {
    const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);

    if (isNaN(num) || !Number.isInteger(num) || num <= 0 || num > 9999) {
        throw new BusinessError(
            ErrorCode.VALIDATION_ERROR,
            `Invalid quantity: "${value}". Must be a positive integer between 1 and 9999.`,
            { value }
        );
    }

    return num;
}

/**
 * Sanitize user message.
 * - Strips control characters
 * - Trims whitespace
 * - Limits length to MAX_MESSAGE_LENGTH
 */
export function sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') {
        return '';
    }

    return message
        .replace(CONTROL_CHAR_REGEX, '')
        .trim()
        .slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Validate required Twilio webhook fields.
 * Ensures From, Body, and MessageSid are present and non-empty.
 */
export function validateWebhookPayload(payload: Record<string, string>): void {
    const requiredFields = ['From', 'Body', 'MessageSid'];
    const missing = requiredFields.filter(
        (field) => !payload[field] || payload[field].trim() === ''
    );

    if (missing.length > 0) {
        throw new BusinessError(
            ErrorCode.VALIDATION_ERROR,
            `Missing required webhook fields: ${missing.join(', ')}`,
            { missing }
        );
    }
}
