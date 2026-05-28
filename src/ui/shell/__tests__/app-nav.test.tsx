import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AppNav } from '../app-nav';

vi.mock('next/navigation', () => ({
    usePathname: () => '/cockpit',
}));

describe('AppNav canonical cockpit navigation', () => {
    it('renders only permitted foundation modules for operators', () => {
        const html = renderToStaticMarkup(<AppNav role="operator" tenantId="tenant-1" />);

        expect(html).toContain('Cockpit');
        expect(html).toContain('Conversas');
        expect(html).toContain('Clientes');
        expect(html).toContain('Pedidos');
        expect(html).toContain('Logistica');
        expect(html).not.toContain('href="/tenant"');
        expect(html).not.toContain('href="/configuracoes"');
        expect(html).not.toContain('Cockpit Legacy');
    });

    it('keeps owner/admin navigation on canonical routes only', () => {
        const html = renderToStaticMarkup(<AppNav role="super_admin" tenantId="tenant-1" />);

        expect(html).toContain('Tenant');
        expect(html).toContain('Configuracoes');
        expect(html).toContain('Cockpit');
        expect(html).not.toContain('Cockpit Legacy');
        expect(html).not.toContain('/dashboard');
    });
});
