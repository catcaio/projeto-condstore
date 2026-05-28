import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceFoundationPage } from '@/modules/workspace/foundation';
import { loadClientsHydrated } from '@/modules/clientes/customer.loader';
import { getIntegrationsStatus, getTenantBasics } from '@/app/(app)/settings/queries';
import { getServerSessionUser } from '@/infra/auth/session';
import { headers } from 'next/headers';

vi.mock('next/headers', () => ({
    headers: vi.fn(),
}));

vi.mock('@/infra/auth/session', () => ({
    getServerSessionUser: vi.fn(),
}));

vi.mock('@/modules/clientes/customer.loader', () => ({
    loadClientsHydrated: vi.fn(),
}));

vi.mock('@/modules/pedidos/server', () => ({
    loadOrdersHydrated: vi.fn(),
}));

vi.mock('@/app/(app)/settings/queries', () => ({
    getEnvironmentInfo: () => ({
        domain: 'localhost',
        env: 'test',
        gitSha: 'abcdef123456',
        nodeEnv: 'test',
        stripeEnabled: false,
    }),
    getIntegrationsStatus: vi.fn(),
    getTenantBasics: vi.fn(),
}));

async function resolveServerElement(element: any) {
    let current = element;
    while (current && typeof current.type === 'function') {
        current = await current.type(current.props);
    }
    return current;
}

describe('WorkspaceFoundationPage critical routes', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(headers).mockResolvedValue(new Map([
            ['x-auth-tenant-id', 'tenant-session'],
            ['x-auth-role', 'admin'],
            ['x-request-id', 'req-test-123'],
        ]) as any);
        vi.mocked(getServerSessionUser).mockResolvedValue({
            sub: 'user-1',
            tenantId: 'tenant-session',
            role: 'admin',
        } as any);
    });

    it('fails closed when tenant context is missing instead of using a seed fallback', async () => {
        vi.mocked(headers).mockResolvedValue(new Map() as any);
        vi.mocked(getServerSessionUser).mockResolvedValue(null as any);

        const element = await WorkspaceFoundationPage({ moduleId: 'clientes' });
        const html = renderToStaticMarkup(await resolveServerElement(element));

        expect(html).toContain('Sessao operacional nao encontrada');
        expect(html).toContain('Nenhum tenantId foi inferido de fallback ou seed');
        expect(html).not.toContain('550e8400-e29b-41d4-a716-446655440000');
        expect(loadClientsHydrated).not.toHaveBeenCalled();
    });

    it('renders a traceable Clientes error state without masking loader failures', async () => {
        vi.mocked(loadClientsHydrated).mockRejectedValue(new Error('db down'));

        const element = await WorkspaceFoundationPage({ moduleId: 'clientes' });
        const html = renderToStaticMarkup(await resolveServerElement(element));

        expect(loadClientsHydrated).toHaveBeenCalledWith('tenant-session');
        expect(html).toContain('Clientes indisponiveis');
        expect(html).toContain('requestId=req-test-123');
    });

    it('renders configuracoes with tenant, environment and integration status', async () => {
        vi.mocked(getTenantBasics).mockResolvedValue({
            id: 'tenant-session',
            name: 'Lojacond',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            plan: 'pro',
            planStatus: 'active',
        } as any);
        vi.mocked(getIntegrationsStatus).mockResolvedValue({
            stripe: 'active',
            whatsapp: true,
            aiProviders: 1,
            dbOk: true,
            redisOk: true,
            rollupOk: true,
        } as any);

        const element = await WorkspaceFoundationPage({ moduleId: 'configuracoes' });
        const html = renderToStaticMarkup(await resolveServerElement(element));

        expect(html).toContain('Workspace, ambiente e integracoes');
        expect(html).toContain('Lojacond');
        expect(html).toContain('Stripe');
        expect(html).toContain('WhatsApp/Twilio');
        expect(html).toContain('abcdef123456');
    });
});
