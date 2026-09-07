import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AppNav, Sidebar } from '../app-nav';
import { ThemeProvider } from '@/ui/theme';

vi.mock('next/navigation', () => ({
    usePathname: () => '/cockpit',
}));

function renderSidebar(role = 'operator', tenantId: string | null = 'tenant-1') {
    return renderToStaticMarkup(
        <ThemeProvider>
            <Sidebar role={role} tenantId={tenantId} />
        </ThemeProvider>
    );
}

describe('Sidebar Keyboard & Focus Expansion A11y (static contract)', () => {
    it('renders compact by default with transition and no horizontal overflow', () => {
        const html = renderSidebar();

        // Compact width rendered inline
        expect(html).toContain('width:4.5rem');
        // Width transition + overflow guard for the 4.5rem -> 15rem expansion
        expect(html).toContain('transition-[width]');
        expect(html).toContain('overflow-hidden');
    });

    it('shows tooltips (not inline labels) when compact', () => {
        const html = renderToStaticMarkup(<AppNav role="operator" tenantId="tenant-1" />);

        // Compact desktop labels stay visually hidden on md+ via class
        expect(html).toContain('min-w-0 flex-1 truncate text-sm md:hidden');
        // Compact desktop links expose hover tooltips
        expect(html).toContain('md:group-hover:block');
    });

    it('shows inline labels without tooltips when expanded', () => {
        const html = renderToStaticMarkup(<AppNav role="operator" tenantId="tenant-1" expanded />);

        // Expanded desktop labels render inline next to icons (no md:hidden guard)
        expect(html).toContain('min-w-0 flex-1 truncate text-sm ');
        expect(html).toContain('Cockpit');
        // Expanded links must not render hover tooltips
        expect(html).not.toContain('md:group-hover:block');
    });
});
