import { describe, it, expect } from 'vitest';
import { getVisibleTiles } from '../tiles.service';
import { Role } from '@/ui/auth/entitlements-logic';

describe('Cockpit App Launcher Service', () => {
    it('should return admin-only tiles for an admin role', () => {
        const adminRoles: Role[] = ['admin'];

        for (const role of adminRoles) {
            const result = getVisibleTiles({ tenantId: 'test-1', role });

            const hasAdminAuditTile = result.salas.some(s =>
                s.id === 'admin' && s.tiles.some(t => t.id === 'audit')
            );
            const hasStatusTile = result.salas.some(s =>
                s.id === 'internal' && s.tiles.some(t => t.id === 'status')
            );

            expect(hasAdminAuditTile).toBe(true);
            expect(hasStatusTile).toBe(role === 'admin' ? true : false); // 'status' currently hardcoded only to 'admin'
        }
    });

    it('should restrict sensitive tiles from arbitrary viewer roles', () => {
        const viewerRoles: Role[] = ['viewer', 'operator'];

        for (const role of viewerRoles) {
            const result = getVisibleTiles({ tenantId: 'test-1', role });

            const adminSala = result.salas.find(s => s.id === 'admin');
            const settingsSala = result.salas.find(s => s.id === 'settings');

            expect(adminSala).toBeUndefined(); // Viewer should not see the admin grouping at all
            expect(settingsSala).toBeUndefined();
        }
    });

    it('should sort returned salas and tiles correctly', () => {
        const result = getVisibleTiles({ tenantId: 'test-1', role: 'admin' });

        // Salas sorting
        const salaOrders = result.salas.map(s => s.order);
        const isSalasSorted = salaOrders.every((val, i, arr) => !i || (val >= arr[i - 1]));
        expect(isSalasSorted).toBe(true);

        // Tiles sorting within first populated sala
        if (result.salas.length > 0) {
            const firstSala = result.salas[0];
            const tileOrders = firstSala.tiles.map(t => t.order);
            const isTilesSorted = tileOrders.every((val, i, arr) => !i || (val >= arr[i - 1]));
            expect(isTilesSorted).toBe(true);
        }
    });
});
