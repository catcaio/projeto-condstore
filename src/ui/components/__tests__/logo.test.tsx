import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CondstoreLogo, CondstoreSymbol } from '../Logo';

describe('CondstoreLogo & CondstoreSymbol', () => {
    it('renders default V1 symbol and wordmark correctly', () => {
        const html = renderToStaticMarkup(<CondstoreLogo />);
        expect(html).toContain('CONDSTORE');
        expect(html).toContain('OS');
        expect(html).toContain('Um complexo sem complexidade.');
        expect(html).toContain('aria-label="Símbolo CONDSTORE OS"');
    });

    it('renders with hideSubtitle prop', () => {
        const html = renderToStaticMarkup(<CondstoreLogo hideSubtitle />);
        expect(html).toContain('CONDSTORE');
        expect(html).not.toContain('Um complexo sem complexidade.');
    });

    it('renders symbol-only when hideText is true', () => {
        const html = renderToStaticMarkup(<CondstoreLogo hideText />);
        // Não deve renderizar a div com os textos visíveis do wordmark
        expect(html).not.toContain('font-bold tracking-tight');
        expect(html).not.toContain('Um complexo sem complexidade.');
        expect(html).toContain('aria-label="Símbolo CONDSTORE OS"');
    });

    it('renders symbol-only layout', () => {
        const html = renderToStaticMarkup(<CondstoreLogo layout="symbol-only" />);
        expect(html).not.toContain('font-bold tracking-tight');
        expect(html).toContain('aria-label="Símbolo CONDSTORE OS"');
    });

    it('renders with badgeOs variant', () => {
        const html = renderToStaticMarkup(<CondstoreLogo badgeOs />);
        expect(html).toContain('rounded-md');
        expect(html).toContain('OS');
    });

    it('renders vertical layout', () => {
        const html = renderToStaticMarkup(<CondstoreLogo layout="vertical" />);
        expect(html).toContain('flex-col');
    });

    it('renders all symbol variations correctly', () => {
        const v1Html = renderToStaticMarkup(<CondstoreSymbol variant="v1" />);
        expect(v1Html).toContain('aria-label="Símbolo CONDSTORE OS"');

        const v2Html = renderToStaticMarkup(<CondstoreSymbol variant="v2" />);
        expect(v2Html).toContain('aria-label="Símbolo CONDSTORE OS Constelação Tri-nó"');

        const v3Html = renderToStaticMarkup(<CondstoreSymbol variant="v3" />);
        expect(v3Html).toContain('aria-label="Símbolo CONDSTORE OS Fio Contínuo"');

        const monoHtml = renderToStaticMarkup(<CondstoreSymbol variant="mono" />);
        expect(monoHtml).toContain('aria-label="Símbolo CONDSTORE OS Monocromático"');
    });
});
