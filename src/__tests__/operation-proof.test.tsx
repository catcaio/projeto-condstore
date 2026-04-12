import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OperationProof } from '../ui/site/operation-proof';

describe('OperationProof', () => {
    it('renderiza a variante compacta com sinais operacionais essenciais', () => {
        const html = renderToStaticMarkup(<OperationProof variant="compact" />);

        expect(html).toContain('Prova operacional');
        expect(html).toContain('30s');
        expect(html).toContain('refresh do cockpit');
        expect(html).toContain('Handoff humano');
        expect(html).not.toContain('LGPD, rate limit e kill switch');
    });

    it('renderiza a variante expandida com o conjunto completo de guardrails', () => {
        const html = renderToStaticMarkup(<OperationProof variant="expanded" />);

        expect(html).toContain('3 etapas');
        expect(html).toContain('LGPD, rate limit e kill switch');
        expect(html).toContain('Handoff não é fallback improvisado');
    });
});
