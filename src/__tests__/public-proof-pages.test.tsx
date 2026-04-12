import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from '../app/(public)/page';
import PlataformaPage from '../app/(public)/plataforma/page';

describe('Public proof pages', () => {
    it('mantém a home alinhada ao gate de aprovação e ao bloco compacto', () => {
        const html = renderToStaticMarkup(<HomePage />);

        expect(html).toContain('Fluxo supervisionado');
        expect(html).toContain('Aprovação exigida');
        expect(html).toContain('0 envio');
        expect(html).not.toContain('LGPD, rate limit e kill switch');
    });

    it('mantém a plataforma com a variante expandida de prova operacional', () => {
        const html = renderToStaticMarkup(<PlataformaPage />);

        expect(html).toContain('LGPD, rate limit e kill switch');
        expect(html).toContain('Governança, observabilidade e handoff');
    });
});
