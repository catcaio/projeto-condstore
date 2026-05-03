import { describe, it, expect } from 'vitest';
import { normalizeWhatsAppNumber, isValidWhatsAppNumber } from '../normalize';

describe('normalizeWhatsAppNumber', () => {
    it('handles null, undefined, and empty string', () => {
        expect(normalizeWhatsAppNumber(null)).toBe('');
        expect(normalizeWhatsAppNumber(undefined)).toBe('');
        expect(normalizeWhatsAppNumber('')).toBe('');
    });

    it('removes leading/trailing whitespace and converts to lowercase', () => {
        expect(normalizeWhatsAppNumber(' WhatsApp:+14155238886 ')).toBe('whatsapp:+14155238886');
        expect(normalizeWhatsAppNumber(' WHATSAPP:+14155238886 ')).toBe('whatsapp:+14155238886');
    });

    it('removes all whitespace, including spaces after colon', () => {
        expect(normalizeWhatsAppNumber('whatsapp: +1415 523 8886')).toBe('whatsapp:+14155238886');
        expect(normalizeWhatsAppNumber(' whatsapp: +1415 523 8886 ')).toBe('whatsapp:+14155238886');
    });

    it('removes special characters except : and +', () => {
        expect(normalizeWhatsAppNumber('whatsapp:+1(415)-523-8886!')).toBe('whatsapp:+14155238886');
    });
});

describe('isValidWhatsAppNumber', () => {
    it('accepts valid canonical WhatsApp number', () => {
        expect(isValidWhatsAppNumber('whatsapp:+14155238886')).toBe(true);
    });

    it('rejects missing + symbol', () => {
        expect(isValidWhatsAppNumber('whatsapp:14155238886')).toBe(false);
    });

    it('rejects missing whatsapp: prefix', () => {
        expect(isValidWhatsAppNumber('+14155238886')).toBe(false);
        expect(isValidWhatsAppNumber(':+14155238886')).toBe(false);
    });

    it('rejects non-digit characters at the end', () => {
        expect(isValidWhatsAppNumber('whatsapp:+14155238886a')).toBe(false);
        expect(isValidWhatsAppNumber('whatsapp:+14155238886!')).toBe(false);
    });

    it('rejects empty string and missing numbers', () => {
        expect(isValidWhatsAppNumber('')).toBe(false);
        expect(isValidWhatsAppNumber('whatsapp:+')).toBe(false);
        expect(isValidWhatsAppNumber('whatsapp:')).toBe(false);
    });

    it('rejects incorrect prefix casing if not normalized', () => {
        expect(isValidWhatsAppNumber('WhatsApp:+14155238886')).toBe(false);
    });
});
