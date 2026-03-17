import { describe, it, expect, vi } from 'vitest';
import CockpitPage from '../page';
import { rooms } from '@/modules/cockpit';

// Mock Next.js headers
vi.mock('next/headers', () => ({
    headers: async () => new Map([
        ['x-auth-tenant-id', 'test-tenant'],
        ['x-auth-role', 'admin']
    ])
}));

describe('Cockpit Home Page (Launcher)', () => {
    it('is a valid functional component that references rooms', async () => {
        expect(typeof CockpitPage).toBe('function');
        
        const searchParamsPromise = Promise.resolve({});
        const rendered = await CockpitPage({ searchParams: searchParamsPromise });
        
        expect(rendered).toBeDefined();
        // Since it's a Server Component we just verify it executes without throwing and that rooms registry is solid.
        expect(rooms.length).toBeGreaterThan(0);
    });
});
