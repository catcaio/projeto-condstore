import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/ui/context/SessionContext', () => ({
    useSession: vi.fn(),
    SessionProvider: ({ children }: any) => children
}));
vi.mock('next/navigation', () => ({
    usePathname: vi.fn()
}));

vi.mock('lucide-react', () => ({ shieldAlert: () => null }));
vi.mock('../card', () => ({ Card: () => null, CardHeader: () => null, CardContent: () => null }));

import { isModuleAuthorized, findModuleForPath } from '../route-guard';
import { MODULES } from '../../../config/modules';

describe('RBAC & Guardrails', () => {

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('isModuleAuthorized & Guard', () => {
        const mockModule: any = {
            id: 'mock',
            requiredRoles: ['admin', 'operator'],
            requiredPlan: 'pro'
        };

        it('should authorize if user has role and plan', () => {
            const { authorized, reason } = isModuleAuthorized(mockModule, 'operator', true);
            expect(authorized).toBe(true);
            expect(reason).toBe('ok');
        });

        it('should block if user lacks role', () => {
            const { authorized, reason } = isModuleAuthorized(mockModule, 'viewer', true);
            expect(authorized).toBe(false);
            expect(reason).toBe('role');
        });

        it('should block if user lacks plan', () => {
            const { authorized, reason } = isModuleAuthorized(mockModule, 'operator', false);
            expect(authorized).toBe(false);
            expect(reason).toBe('plan');
        });
    });

    describe('Sidebar RBAC Logic Validation', () => {
        it('Dispatch should be blocked for viewer role', () => {
            const dispatchModule = MODULES.find(m => m.id === 'dispatch')!;
            const { authorized, reason } = isModuleAuthorized(dispatchModule, 'viewer', true);
            expect(authorized).toBe(false);
            expect(reason).toBe('role');
        });

        it('Eventos Logisticos should be visible for viewer', () => {
            const eventosModule = MODULES.find(m => m.id === 'events')!;
            const { authorized, reason } = isModuleAuthorized(eventosModule, 'viewer', true);
            expect(authorized).toBe(true);
            expect(reason).toBe('ok');
        });

        it('Dispatch should block by plan if operator has no plan', () => {
            const dispatchModule = MODULES.find(m => m.id === 'dispatch')!;
            const { authorized, reason } = isModuleAuthorized(dispatchModule, 'operator', false);
            expect(authorized).toBe(false);
            expect(reason).toBe('plan');
        });
    });

    describe('Breadcrumb dynamic routing logic fallback', () => {
        it('resolves exactly matched title from module config', () => {
            const mod = findModuleForPath('/cockpit/knowledge');
            expect(mod?.id).toBe('knowledge');

            // Simulation of what Breadcrumb does
            const exactRoute = mod?.routes.find(r => new RegExp(`^${r.pattern.replace(/:[^\s/]+/g, '([^/]+)$')}`).test('/cockpit/knowledge'));
            expect(exactRoute?.title).toBe('KNOWLEDGE BASE');
        });

        it('resolves dynamic route title', () => {
            const mod = findModuleForPath('/modules/routes/123'); // matching /modules/routes/:id
            expect(mod?.id).toBe('routes');

            const regexStr = '/modules/routes/:id'.replace(/:[^\s/]+/g, '([^/]+)');
            expect(new RegExp(`^${regexStr}$`).test('/modules/routes/123')).toBe(true);
        });

        it('resolves exactly matched title from dashboard', () => {
            const mod = findModuleForPath('/cockpit');
            expect(mod?.id).toBe('cockpit');
        });
    });
});
