import { describe, expect, it } from 'vitest';
import { calculateRoi } from '../ui/components/roi-calculator';

describe('ROI Calculator Logic', () => {
    it('deve calcular corretamente a economia operacional e aumento de conversão', () => {
        const result = calculateRoi(500, 150, 10, 5);

        expect(result.economiaOperacional).toBe(2500); // 500 * 5 = 2500
        expect(result.aumentoConversao).toBe(7500); // 500 * 150 * 0.1 = 7500
        expect(result.totalRecuperado).toBe(10000); // 2500 + 7500 = 10000
    });

    it('deve arredondar corretamente', () => {
        const result = calculateRoi(100, 49.90, 5, 2.75);

        expect(result.economiaOperacional).toBe(275); // 100 * 2.75
        expect(result.aumentoConversao).toBe(250); // M.round(100 * 49.9 * 0.05 = 249.5) -> 250
        expect(result.totalRecuperado).toBe(525);
    });

    it('snapshot da estrutura de cálculo', () => {
        const result = calculateRoi(1000, 200, 15, 8);

        expect(result).toMatchInlineSnapshot(`
          {
            "aumentoConversao": 30000,
            "economiaOperacional": 8000,
            "totalRecuperado": 38000,
          }
        `);
    });
});
