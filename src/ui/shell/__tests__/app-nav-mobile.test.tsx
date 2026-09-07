import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AppNav } from '../app-nav';

vi.mock('next/navigation', () => ({
    usePathname: () => '/cockpit',
}));

describe('AppNav Mobile Drawer A11y (static contract)', () => {
    it('renders hamburger trigger with closed-state ARIA attributes', () => {
        const html = renderToStaticMarkup(<AppNav role="operator" tenantId="tenant-1" />);

        // Trigger exists with accessible closed state
        expect(html).toContain('aria-expanded="false"');
        expect(html).toContain('aria-controls="mobile-nav-drawer"');
        expect(html).toContain('Abrir menu de navegação');
    });

    it('does not render the dialog drawer in initial (closed) state', () => {
        const html = renderToStaticMarkup(<AppNav role="operator" tenantId="tenant-1" />);

        expect(html).not.toContain('role="dialog"');
        expect(html).not.toContain('id="mobile-nav-drawer"');
    });

    it('exposes a labeled principal navigation landmark', () => {
        const html = renderToStaticMarkup(<AppNav role="operator" tenantId="tenant-1" />);

        expect(html).toContain('aria-label="Menu principal"');
    });
});
