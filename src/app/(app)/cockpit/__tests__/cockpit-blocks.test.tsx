import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CockpitFunnelBlock } from '../_components/CockpitFunnelBlock';
import { CockpitFreightBlock } from '../_components/CockpitFreightBlock';
import { CockpitAttributionBlock } from '../_components/CockpitAttributionBlock';

describe('Shield 7: Cockpit Funnel Block Resilience', () => {
    it('Should not break or show NaN when counts are missing or zero', () => {
        const brokenFunnel = {
            window_7d: {
                counts: {
                    flow_started: 100,
                    intent_detected: 0, // Zero dropoff test
                    asked_cep: null, // Missing data test
                    cep_provided: undefined,
                    freight_quoted: 50
                }
            }
        };

        const html = renderToStaticMarkup(<CockpitFunnelBlock funnel={brokenFunnel} loading={false} />);
        
        // Assert no NaNs physically printed in the DOM
        expect(html).not.toMatch(/NaN/);
        expect(html).not.toMatch(/Infinity/);

        // Assert valid zeroes and explicit '-' fallbacks are handled
        expect(html).toMatch(/100/); // flow_started
        expect(html).toMatch(/0/); // intent_detected
    });
});

describe('Shield 8: Cockpit Freight Block Resilience', () => {
    it('Should handle mismatched top_ufs vs avg_valor safely and defensively parse numbers', () => {
        const partialFreight = {
            total_simulations_7d: 20,
            avg_peso_7d: "invalid_weight_string",
            top_ufs_7d: [
                { uf: 'SP', count: 15 },
                { uf: 'RJ', count: "5" } // String instead of number
            ],
            avg_valor_by_uf_7d: [
                { uf: 'SP', avg_valor: "15.50" }
                // Notice RJ is entirely missing
            ]
        };

        const html = renderToStaticMarkup(<CockpitFreightBlock freight={partialFreight} loading={false} />);
        
        expect(html).not.toMatch(/NaN/);
        
        // Assert weight parsing defaults to 0.00 kg
        expect(html).toMatch(/0\.00 kg/);
        
        // Assert SP got its mocked format
        expect(html).toMatch(/15,50/);
        
        // Assert RJ safely defaulted to R$ 0,00 even though it was missing from avg_valor mapping
        expect(html).toMatch(/0,00/);
    });
});

describe('Shield 9: Cockpit Attribution Block Truthfulness', () => {
    it('Should show filter requirement instruction if groupBy is none', () => {
        const html = renderToStaticMarkup(<CockpitAttributionBlock funnel={{}} groupBy="none" loading={false} />);
        expect(html).toMatch(/Selecione um filtro/i);
    });

    it('Should show actual unavailable message when funnel fails/is null', () => {
        const html = renderToStaticMarkup(<CockpitAttributionBlock funnel={null} groupBy="utm_campaign" loading={false} />);
        expect(html).toMatch(/Dados de atribuição temporariamente indisponíveis/i);
    });

    it('Should render valid channels when data is present', () => {
        const validFunnel = {
            attribution_breakdown_7d: { buckets: [{ key: 'black_friday', count: 42 }] }
        };
        const html = renderToStaticMarkup(<CockpitAttributionBlock funnel={validFunnel} groupBy="utm_campaign" loading={false} />);
        expect(html).toMatch(/42/);
        expect(html).toMatch(/black_friday/);
    });
});
