import { describe, it, expect } from 'vitest';
import { safeCompare } from '../safe-compare';

describe('security/safeCompare', () => {
    it('returns true for identical strings', () => {
        expect(safeCompare('secret-token-123', 'secret-token-123')).toBe(true);
    });

    it('returns false for completely different strings of different lengths', () => {
        expect(safeCompare('short', 'longer-string')).toBe(false);
    });

    it('returns false for different strings of the exact same length', () => {
        expect(safeCompare('apple', 'grape')).toBe(false);
    });

    it('returns false safely without throwing when lengths differ', () => {
        // crypto.timingSafeEqual throws if lengths differ. safeCompare must handle this.
        expect(() => safeCompare('a', 'aa')).not.toThrow();
        expect(safeCompare('a', 'aa')).toBe(false);
    });

    it('returns false if left string is undefined or null', () => {
        expect(safeCompare(undefined, 'test')).toBe(false);
        expect(safeCompare(null, 'test')).toBe(false);
    });

    it('returns false if right string is undefined or null', () => {
        expect(safeCompare('test', undefined)).toBe(false);
        expect(safeCompare('test', null)).toBe(false);
    });

    it('returns false if both strings are undefined or null', () => {
        expect(safeCompare(undefined, undefined)).toBe(false);
        expect(safeCompare(null, null)).toBe(false);
    });
});
