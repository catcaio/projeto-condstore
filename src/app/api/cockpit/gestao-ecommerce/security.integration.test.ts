import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSessionToken } from '@/infra/auth/session';
import { userRepository } from '@/infra/repositories/user.repository';
import { getEcommerceCockpit as readCockpit } from '@/modules/cockpit/gestao-ecommerce/service';
import { getEcommerceCockpit, ecommerceRepository } from '@/modules/cockpit/gestao-ecommerce/server';
import type { EcommerceActor } from '@/modules/cockpit/gestao-ecommerce/types';
import type { EcommerceReadRepository, EcommerceStoredProject, EcommerceStoredSpace } from '@/modules/cockpit/gestao-ecommerce/repository';
import { GET, POST } from './route';

// Keep JWT verification and session/role guards real. Replace only external persistence.
vi.mock('@/infra/repositories/user.repository', () => ({ userRepository: { getUserById: vi.fn() } }));
vi.mock('@/modules/cockpit/gestao-ecommerce/server', () => ({
    getEcommerceCockpit: vi.fn(), ecommerceRepository: { seedDemonstration: vi.fn(), configure: vi.fn() },
}));

const url = 'http://localhost:3000/api/cockpit/gestao-ecommerce';
const when = new Date('2026-10-30T12:00:00.000Z');
function storedProject(tenantId: string, id: string): EcommerceStoredProject {
    return {
        id, tenantId, spaceId: `${tenantId}-space`, name: tenantId === 'tenant-b' ? 'SECRET-TENANT-B' : 'Synthetic project A',
        slug: id, description: null, visibility: 'private', status: 'planned', sortOrder: 0,
        createdBy: 'synthetic-owner', createdAt: when, updatedAt: when, archivedAt: null,
        ecommerceMetadata: {
            module: 'ecommerce', version: 1, code: id, frontCode: 'F02', isDemo: false,
            problem: null, objective: null, diagnosis: null, hypothesis: null, kpi: null,
            responsible: null, responsibleUserId: null, assignedUserIds: [], sharedForViewers: false,
            priority: 'normal', startAt: null, expectedAt: null, nextMilestone: null,
            evidence: [], observedResult: null, learning: null, blockers: [], pendingDecisions: [],
            source: { type: 'manual', externalId: null, url: null, updatedAt: when.toISOString() },
        },
    };
}
function mixedRepository(): EcommerceReadRepository {
    return {
        // Intentionally return mixed data to exercise the service's second isolation boundary.
        listProjects: vi.fn().mockResolvedValue([storedProject('tenant-a', 'project-a'), storedProject('tenant-b', 'project-b')]),
        listTasks: vi.fn().mockResolvedValue([]), listLists: vi.fn().mockResolvedValue([]),
        listEvents: vi.fn().mockResolvedValue([]), getConfig: vi.fn().mockResolvedValue(null),
        listSpaces: vi.fn().mockResolvedValue(['tenant-a', 'tenant-b'].map((tenantId): EcommerceStoredSpace => ({
            id: `${tenantId}-space`, tenantId, name: 'Synthetic front', slug: 'ecommerce-f02', color: null,
            icon: null, createdAt: when, updatedAt: when, archivedAt: null,
        }))),
    };
}
async function token(role: EcommerceActor['role'] = 'manager') {
    return createSessionToken({ id: 'synthetic-user-a', tenantId: 'tenant-a', role, email: 'synthetic@example.invalid', sessionVersion: 1 });
}
function request(cookie: string, query = '', body?: unknown, origin = 'http://localhost:3000') {
    return new NextRequest(`${url}${query}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { cookie: `condstore_session=${cookie}`, origin, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
}

describe('Ecommerce security integration with signed sessions and real guards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(userRepository.getUserById).mockResolvedValue({ id: 'synthetic-user-a', sessionVersion: 1 } as never);
        vi.mocked(getEcommerceCockpit).mockImplementation((actor, filters) => readCockpit(actor, filters, mixedRepository()));
    });

    it('blocks a valid tenant A session from requesting a tenant B project by direct ID', async () => {
        const response = await GET(request(await token(), '?projectId=project-b'));
        expect(response.status).toBe(200);
        const snapshot = await response.json();
        expect(snapshot.projects).toEqual([]);
        expect(snapshot.management.activeProjects).toBe(0);
        expect(JSON.stringify(snapshot)).not.toContain('SECRET-TENANT-B');
        expect(getEcommerceCockpit).toHaveBeenCalledWith({ tenantId: 'tenant-a', userId: 'synthetic-user-a', role: 'manager' }, { projectId: 'project-b' });
    });

    it.each(['viewer', 'operator'] as const)('blocks direct access to an unshared tenant-local project for %s', async (role) => {
        const response = await GET(request(await token(role), '?projectId=project-a'));
        expect(response.status).toBe(200);
        expect((await response.json()).projects).toEqual([]);
    });

    it('rejects forged session cookies before reading any project', async () => {
        expect((await GET(request('invalid.signed.cookie'))).status).toBe(401);
        expect(getEcommerceCockpit).not.toHaveBeenCalled();
    });

    it('rejects a cryptographically valid but revoked session before reading projects', async () => {
        vi.mocked(userRepository.getUserById).mockResolvedValue({ id: 'synthetic-user-a', sessionVersion: 2 } as never);
        expect((await GET(request(await token()))).status).toBe(401);
        expect(getEcommerceCockpit).not.toHaveBeenCalled();
    });

    it('blocks an authenticated manager from writing through a direct API call', async () => {
        expect((await POST(request(await token('manager'), '', { action: 'seed_demo' }))).status).toBe(403);
        expect(ecommerceRepository.seedDemonstration).not.toHaveBeenCalled();
    });

    it('blocks a cross-origin write even with a valid admin session', async () => {
        expect((await POST(request(await token('admin'), '', { action: 'seed_demo' }, 'https://attacker.example'))).status).toBe(403);
        expect(ecommerceRepository.seedDemonstration).not.toHaveBeenCalled();
    });
});
