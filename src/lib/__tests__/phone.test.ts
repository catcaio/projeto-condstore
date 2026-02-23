import { describe, it, expect } from 'vitest';
import { normalizePhone, phoneHash, normalizeAndHash, isValidPhone } from '../phone';

describe('normalizePhone', () => {
    it('lowercases and strips whitespace', () => {
        expect(normalizePhone('WhatsApp: +5511 987654321 ')).toBe('whatsapp:+5511987654321');
    });

    it('handles standard whatsapp: prefix', () => {
        expect(normalizePhone('whatsapp:+14155238886')).toBe('whatsapp:+14155238886');
    });

    it('returns empty string for falsy input', () => {
        expect(normalizePhone(null)).toBe('');
        expect(normalizePhone(undefined)).toBe('');
        expect(normalizePhone('')).toBe('');
    });
});

describe('phoneHash', () => {
    it('returns a 64-char hex string', () => {
        expect(phoneHash('whatsapp:+5511987654321')).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic — same input → same hash', () => {
        const h1 = phoneHash('whatsapp:+5511987654321');
        const h2 = phoneHash('whatsapp:+5511987654321');
        expect(h1).toBe(h2);
    });

    it('returns "empty" for empty string', () => {
        expect(phoneHash('')).toBe('empty');
    });
});

describe('normalizeAndHash', () => {
    it('always hashes the normalised form — not the raw form', () => {
        const rawWithSpaces = 'WhatsApp: +5511 987654321 ';
        const { normalized, hash } = normalizeAndHash(rawWithSpaces);

        // Verify the hash matches what we'd get by hashing the normalised string
        expect(hash).toBe(phoneHash(normalized));

        // Ensure the raw (non-normalised) hash does NOT match
        const rawHash = phoneHash(rawWithSpaces);
        expect(hash).not.toBe(rawHash);
    });

    it('produces the same hash for semantically identical numbers', () => {
        const { hash: h1 } = normalizeAndHash('whatsapp:+5511987654321');
        const { hash: h2 } = normalizeAndHash('WhatsApp:+5511987654321');
        expect(h1).toBe(h2);
    });

    it('tenant + normalised phone always maps to the same cache key', () => {
        const tenantId = 'tenant-xyz';
        const { hash } = normalizeAndHash('WhatsApp: +55 11 98765-4321');
        const key = `ctx:dev:condstore-core:${tenantId}:${hash}`;
        // Key is stable across multiple calls
        expect(key).toBe(`ctx:dev:condstore-core:${tenantId}:${normalizeAndHash('whatsapp:+5511987654321').hash}`);
    });
});

describe('isValidPhone', () => {
    it('accepts canonical whatsapp format', () => {
        expect(isValidPhone('whatsapp:+14155238886')).toBe(true);
    });

    it('rejects non-whatsapp strings', () => {
        expect(isValidPhone('+14155238886')).toBe(false);
        expect(isValidPhone('14155238886')).toBe(false);
        expect(isValidPhone('')).toBe(false);
    });
});
