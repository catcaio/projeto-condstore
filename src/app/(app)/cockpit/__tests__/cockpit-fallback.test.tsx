import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkspaceFoundationPage } from '@/modules/workspace/foundation';
import * as getCockpitDataModule from '@/modules/cockpit/data/get-cockpit-data';

// Mock Next.js headers and auth session to avoid throwing during render
vi.mock('next/headers', () => ({
    headers: async () => new Map([
        ['x-auth-tenant-id', 'test-tenant'],
        ['x-auth-role', 'admin']
    ])
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
    }),
}));

vi.mock('@/infra/auth/session', () => ({
    getServerSessionUser: async () => ({
        id: 'test-user',
        tenantId: 'test-tenant',
        role: 'admin'
    })
}));

describe('Cockpit Diagnostic Fallback Banner Regression Tests', () => {
    it('Should render the diagnostic banner with tenant_context_missing details and without mock integers', async () => {
        const getCockpitDataSpy = vi.spyOn(getCockpitDataModule, 'getCockpitData').mockResolvedValueOnce({
            metrics: [
                {
                    id: 'active-conversations',
                    label: 'Conversas ativas',
                    value: 'N/A',
                    helper: 'Dados indisponiveis (fallback).',
                    tone: 'neutral',
                    href: '#',
                },
                {
                    id: 'orders-processing',
                    label: 'Pedidos em processamento',
                    value: 'N/A',
                    helper: 'Dados indisponiveis (fallback).',
                    tone: 'neutral',
                    href: '#'
                }
            ],
            alerts: [],
            events: [],
            queue: [],
            systemStatus: [],
            shortcuts: [],
            meta: {
                source: 'fallback',
                generatedAt: new Date().toISOString(),
                partialBlocks: ['session'],
                fallbackReason: 'tenant_context_missing',
            },
        });

        const element = await WorkspaceFoundationPage({ moduleId: 'cockpit' });
        const resolvedElement = await (element.type as any)(element.props);
        const html = renderToStaticMarkup(resolvedElement);

        // 1. Assert diagnostic values are printed exactly
        expect(html).toContain('Modo Fallback Ativo (Diagnostico)');
        expect(html).toContain('source=fallback');
        expect(html).toContain('fallbackReason=tenant_context_missing');
        expect(html).toContain('partialBlocks=[session]');

        // 2. Assert no fictitious mock KPIs (like 126 conversations, 248 orders) are rendered
        expect(html).not.toContain('126');
        expect(html).not.toContain('248');

        getCockpitDataSpy.mockRestore();
    });

    it('Should render the diagnostic banner with cockpit_data_query_failed details and without mock integers', async () => {
        const getCockpitDataSpy = vi.spyOn(getCockpitDataModule, 'getCockpitData').mockResolvedValueOnce({
            metrics: [
                {
                    id: 'active-conversations',
                    label: 'Conversas ativas',
                    value: 'N/A',
                    helper: 'Dados indisponiveis (fallback).',
                    tone: 'neutral',
                    href: '#',
                },
                {
                    id: 'orders-processing',
                    label: 'Pedidos em processamento',
                    value: 'N/A',
                    helper: 'Dados indisponiveis (fallback).',
                    tone: 'neutral',
                    href: '#'
                }
            ],
            alerts: [],
            events: [],
            queue: [],
            systemStatus: [],
            shortcuts: [],
            meta: {
                source: 'fallback',
                generatedAt: new Date().toISOString(),
                partialBlocks: ['cockpit_data'],
                fallbackReason: 'cockpit_data_query_failed',
            },
        });

        const element = await WorkspaceFoundationPage({ moduleId: 'cockpit' });
        const resolvedElement = await (element.type as any)(element.props);
        const html = renderToStaticMarkup(resolvedElement);

        // 1. Assert diagnostic values are printed exactly
        expect(html).toContain('Modo Fallback Ativo (Diagnostico)');
        expect(html).toContain('source=fallback');
        expect(html).toContain('fallbackReason=cockpit_data_query_failed');
        expect(html).toContain('partialBlocks=[cockpit_data]');

        // 2. Assert no fictitious mock KPIs (like 126 conversations, 248 orders) are rendered
        expect(html).not.toContain('126');
        expect(html).not.toContain('248');

        getCockpitDataSpy.mockRestore();
    });
});
