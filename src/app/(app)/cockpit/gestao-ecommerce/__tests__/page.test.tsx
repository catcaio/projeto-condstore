import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getServerSessionUser } from '@/infra/auth/session';
import { getEcommerceCockpit } from '@/modules/cockpit/gestao-ecommerce/server';
import { snapshotFixture } from '@/modules/cockpit/gestao-ecommerce/components/__tests__/fixtures';
import Page from '../page';
import Loading from '../loading';
import ErrorState from '../error';

vi.mock('@/infra/auth/session', () => ({ getServerSessionUser: vi.fn() }));
vi.mock('@/modules/cockpit/gestao-ecommerce/server', () => ({ getEcommerceCockpit: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); }, useRouter: () => ({ refresh: vi.fn() }) }));

describe('E-commerce authenticated page', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getServerSessionUser).mockResolvedValue({ sub: 'session-user', tenantId: 'session-tenant', role: 'manager', email: 'test@example.invalid', sv: 1 });
        vi.mocked(getEcommerceCockpit).mockResolvedValue(snapshotFixture());
    });

    it('redirects unauthenticated requests before loading tenant data', async () => {
        vi.mocked(getServerSessionUser).mockResolvedValue(null);
        await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/login');
        expect(getEcommerceCockpit).not.toHaveBeenCalled();
    });

    it('rejects unknown roles before loading records', async () => {
        vi.mocked(getServerSessionUser).mockResolvedValue({ sub: 'session-user', tenantId: 'session-tenant', role: 'untrusted', email: 'test@example.invalid', sv: 1 });
        const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
        expect(html).toContain('Sem permissão');
        expect(getEcommerceCockpit).not.toHaveBeenCalled();
    });

    it.each(['admin', 'manager', 'operator', 'viewer'])('uses only authenticated tenant/user/role for %s', async role => {
        vi.mocked(getServerSessionUser).mockResolvedValue({ sub: 'session-user', tenantId: 'session-tenant', role, email: 'test@example.invalid', sv: 1 });
        await Page({ searchParams: Promise.resolve({ tenantId: 'attacker-tenant', userId: 'attacker-user', role: 'admin', frontCode: 'F02' }) });
        expect(getEcommerceCockpit).toHaveBeenCalledWith({ tenantId: 'session-tenant', userId: 'session-user', role }, { frontCode: 'F02', projectId: undefined });
    });

    it.each([{ frontCode: 'F99' }, { frontCode: ['F01', 'F02'] }, { projectId: '' }, { projectId: 'x'.repeat(37) }])('rejects invalid filters %o', async params => {
        const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) }));
        expect(html).toContain('Filtro inválido');
        expect(getEcommerceCockpit).not.toHaveBeenCalled();
    });

    it('passes persistence failures to the error boundary without mock fallback', async () => {
        vi.mocked(getEcommerceCockpit).mockRejectedValue(new Error('database unavailable'));
        await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('database unavailable');
        const html = renderToStaticMarkup(<ErrorState error={new Error('sensitive database details')} reset={vi.fn()} />);
        expect(html).toContain('Gestão de e-commerce indisponível');
        expect(html).not.toContain('sensitive database details');
    });

    it('provides an accessible loading state for mobile and desktop', () => {
        const html = renderToStaticMarkup(<Loading />);
        expect(html).toContain('role="status"');
        expect(html).toContain('Carregando gestão de e-commerce');
        expect(html).not.toContain('min-w-screen');
    });
});
