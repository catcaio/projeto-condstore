import { describe, it, expect } from 'vitest';
import CockpitPage from '../page';
import { rooms } from '@/modules/cockpit/rooms/rooms.registry';

describe('Cockpit Home Page (Launcher)', () => {
    it('is a valid functional component that references rooms', () => {
        expect(typeof CockpitPage).toBe('function');
        const rendered = CockpitPage();
        expect(rendered).toBeDefined();
        // Since it's a Server Component we just verify it executes without throwing and that rooms registry is solid.
        expect(rooms.length).toBeGreaterThan(0);
    });
});
