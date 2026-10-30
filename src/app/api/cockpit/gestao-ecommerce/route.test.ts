import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from './route';
import { requireAdmin, requireSession } from '@/infra/auth/guards';
import { ecommerceRepository, getEcommerceCockpit } from '@/modules/cockpit/gestao-ecommerce/server';

vi.mock('@/infra/auth/guards', () => ({ requireAdmin: vi.fn(), requireSession: vi.fn() }));
vi.mock('@/modules/cockpit/gestao-ecommerce/server', () => ({ getEcommerceCockpit: vi.fn(), ecommerceRepository: { seedDemonstration: vi.fn(), configure: vi.fn() } }));
const success = {
    ok: true as const, requestId: 'request-1',
    session: { tenantId: 'session-tenant', sub: 'session-user', role: 'admin' as const, email: 'test@example.invalid', sv: 1 },
};
function post(body: unknown, origin: string | null = 'http://localhost:3000') {
    return new NextRequest('http://localhost:3000/api/cockpit/gestao-ecommerce', {
        method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body),
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSession).mockResolvedValue(success);
    vi.mocked(requireAdmin).mockResolvedValue(success);
    vi.mocked(getEcommerceCockpit).mockResolvedValue({ projects: [] } as never);
    vi.mocked(ecommerceRepository.seedDemonstration).mockResolvedValue({ projectId: 'demo' });
    vi.mocked(ecommerceRepository.configure).mockResolvedValue(undefined);
});

describe('GET ecommerce cockpit security contract', () => {
    it('requires a session and never reads data for an unauthenticated request', async () => {
        vi.mocked(requireSession).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) } as never);
        expect((await GET(new NextRequest('http://localhost:3000/api/cockpit/gestao-ecommerce'))).status).toBe(401);
        expect(getEcommerceCockpit).not.toHaveBeenCalled();
    });

    it('uses only the authenticated tenant/user/role and disables response caching', async () => {
        const response = await GET(new NextRequest('http://localhost:3000/api/cockpit/gestao-ecommerce?frontCode=F02&projectId=demo', {
            headers: { 'x-tenant-id': 'attacker-tenant', 'x-user-id': 'attacker-user', 'x-role': 'manager' },
        }));
        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe('private, no-store');
        expect(getEcommerceCockpit).toHaveBeenCalledWith({ tenantId: 'session-tenant', userId: 'session-user', role: 'admin' }, { frontCode: 'F02', projectId: 'demo' });
    });

    it.each(['tenantId=other', 'userId=other', 'role=admin', 'frontCode=F99', 'frontCode=F01&frontCode=F02'])('rejects untrusted or invalid filters: %s', async (query) => {
        expect((await GET(new NextRequest(`http://localhost:3000/api/cockpit/gestao-ecommerce?${query}`))).status).toBe(400);
        expect(getEcommerceCockpit).not.toHaveBeenCalled();
    });

    it('returns a safe unavailable state instead of demo data when persistence fails', async () => {
        vi.mocked(getEcommerceCockpit).mockRejectedValue(new Error('sensitive connection detail'));
        const response = await GET(new NextRequest('http://localhost:3000/api/cockpit/gestao-ecommerce'));
        expect(response.status).toBe(503);
        expect(await response.text()).not.toContain('sensitive');
    });
});

describe('POST administrative demo setup', () => {
    it.each(['manager', 'operator', 'viewer'])('cannot be invoked by %s even through a direct API request', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 403 }) } as never);
        expect((await POST(post({ action: 'seed_demo' }))).status).toBe(403);
        expect(ecommerceRepository.seedDemonstration).not.toHaveBeenCalled();
    });

    it.each([null, 'https://other.example'])('rejects missing or foreign origin %s', async (origin) => {
        expect((await POST(post({ action: 'seed_demo' }, origin))).status).toBe(403);
        expect(ecommerceRepository.seedDemonstration).not.toHaveBeenCalled();
    });

    it.each([{ action: 'seed_demo', tenantId: 'other' }, { action: 'seed_demo', role: 'admin' }, { action: 'update_project' }])('accepts only the strict setup action', async (body) => {
        expect((await POST(post(body))).status).toBe(400);
        expect(ecommerceRepository.seedDemonstration).not.toHaveBeenCalled();
    });

    it('rejects tenant overrides supplied as POST query parameters', async () => {
        const request = new NextRequest('http://localhost:3000/api/cockpit/gestao-ecommerce?tenantId=other', {
            method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'seed_demo' }),
        });
        expect((await POST(request)).status).toBe(400);
        expect(ecommerceRepository.seedDemonstration).not.toHaveBeenCalled();
    });

    it('runs explicit demo setup with the authenticated administrator', async () => {
        const response = await POST(post({ action: 'seed_demo' }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ projectId: 'demo', isDemo: true });
        expect(ecommerceRepository.seedDemonstration).toHaveBeenCalledWith({ tenantId: 'session-tenant', userId: 'session-user', role: 'admin' });
    });

    it('stores a workspace binding without claiming verified synchronization', async () => {
        const response = await POST(post({ action: 'configure', operationName: 'Operação de teste', workspace: { id: '12345', name: 'Workspace de teste' } }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ configured: true, syncStatus: 'awaiting_verification' });
        expect(ecommerceRepository.configure).toHaveBeenCalledWith(
            { tenantId: 'session-tenant', userId: 'session-user', role: 'admin' },
            { operationName: 'Operação de teste', workspace: { id: '12345', name: 'Workspace de teste' } },
        );
        expect(ecommerceRepository.seedDemonstration).not.toHaveBeenCalled();
    });

    it.each([
        { action: 'configure', operationName: 'Teste', workspace: { id: 'not-an-id', name: 'Teste' } },
        { action: 'configure', operationName: 'Teste', workspace: { id: '12345', name: 'Teste', token: 'rejected' } },
        { action: 'configure', operationName: 'Teste', workspace: { id: '12345', name: 'Teste' }, tenantId: 'other' },
    ])('rejects credentials and unauthorized fields in workspace configuration', async (body) => {
        expect((await POST(post(body))).status).toBe(400);
        expect(ecommerceRepository.configure).not.toHaveBeenCalled();
    });
});
