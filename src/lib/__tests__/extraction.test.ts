
import { describe, it, expect } from 'vitest';
import { extractCep } from '../extraction';

describe('CEP Extraction', () => {
    it('should extract valid formatted CEP', () => {
        expect(extractCep('Meu cep é 60420-150')).toBe('60420-150');
    });

    it('should extract valid unformatted CEP', () => {
        expect(extractCep('60420150')).toBe('60420-150');
    });

    it('should extract valid CEP from complex text', () => {
        expect(extractCep('quanto fica pro 60420-150, obrigado')).toBe('60420-150');
    });

    it('should return null for invalid CEP (too short/long/chars)', () => {
        expect(extractCep('123')).toBeNull();
        expect(extractCep('60420-15')).toBeNull(); // 7 digits
        expect(extractCep('abcdefgh')).toBeNull();
    });

    it('should extract first valid CEP if multiple', () => {
        expect(extractCep('60420-150 e 12345-678')).toBe('60420-150');
    });
});
