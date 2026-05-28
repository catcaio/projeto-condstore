import { describe, expect, it } from 'vitest';
import { getPrimaryNavigationModules, MODULES } from '../modules';
import { findModuleForPath, isModuleAuthorized } from '../rbac';

describe('canonical cockpit module registry', () => {
    it('uses foundation modules as the only primary sidebar source', () => {
        const primary = getPrimaryNavigationModules();

        expect(primary.map((item) => item.id)).toEqual([
            'cockpit',
            'conversas',
            'pedidos',
            'logistica',
            'clientes',
            'frank',
            'metricas',
            'tenant',
            'configuracoes',
            'operacao',
        ]);
        expect(primary.every((item) => item.navVisible)).toBe(true);
        expect(primary.some((item) => item.group === 'Legacy')).toBe(false);
        expect(primary.some((item) => item.route === '/dashboard')).toBe(false);
    });

    it('keeps legacy settings hidden while configuracoes is canonical', () => {
        const settings = MODULES.find((item) => item.id === 'settings');
        const configuracoes = MODULES.find((item) => item.id === 'configuracoes');

        expect(settings?.navVisible).toBe(false);
        expect(configuracoes?.route).toBe('/configuracoes');
        expect(configuracoes?.navVisible).toBe(true);
    });

    it('allows super_admin and admin to access owner-level modules', () => {
        const tenantModule = findModuleForPath('/tenant');
        const settingsModule = findModuleForPath('/configuracoes');

        expect(tenantModule?.id).toBe('tenant');
        expect(settingsModule?.id).toBe('configuracoes');
        expect(isModuleAuthorized(tenantModule!, 'super_admin', false).authorized).toBe(true);
        expect(isModuleAuthorized(settingsModule!, 'admin', false).authorized).toBe(true);
    });
});
