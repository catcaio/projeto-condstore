import { describe, it, expect } from 'vitest';
import { normalizePhone, hashPhone, isValidE164 } from './normalize-phone';

describe('normalizePhone', () => {
    it('handles numeric string without country code (11 digits)', () => {
        expect(normalizePhone('48999999999')).toBe('+5548999999999');
    });

    it('handles numeric string without country code (10 digits)', () => {
        expect(normalizePhone('4833333333')).toBe('+554833333333');
    });

    it('handles string with spaces and dashes', () => {
        expect(normalizePhone('(48) 99999-9999')).toBe('+5548999999999');
    });

    it('handles string already with 55', () => {
        expect(normalizePhone('5548999999999')).toBe('+5548999999999');
    });

    it('handles string with +55', () => {
        expect(normalizePhone('+55 48 99999-9999')).toBe('+5548999999999');
    });

    it('returns null for empty or invalid input', () => {
        expect(normalizePhone('')).toBeNull();
        expect(normalizePhone(null)).toBeNull();
        expect(normalizePhone('abcdef')).toBeNull();
    });
});

describe('isValidE164', () => {
    it('validates correct E164 format', () => {
        expect(isValidE164('+5548999999999')).toBe(true);
        expect(isValidE164('+1234567890')).toBe(true);
    });

    it('rejects invalid formats', () => {
        expect(isValidE164('5548999999999')).toBe(false); // missing +
        expect(isValidE164('+55 48 99999 9999')).toBe(false); // spaces
        expect(isValidE164('abc')).toBe(false);
    });
});

describe('hashPhone', () => {
    it('produces consistent SHA-256 hex string', () => {
        const hash1 = hashPhone('+5548999999999');
        const hash2 = hashPhone('+5548999999999');
        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('trims whitespace before hashing', () => {
        expect(hashPhone('+5548999999999')).toBe(hashPhone(' +5548999999999 '));
    });
});
