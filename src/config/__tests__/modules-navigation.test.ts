import { describe, expect, it } from 'vitest';
import { getPrimaryNavigationModules, MODULES } from '../modules';
import { findModuleForPath, isModuleAuthorized } from '../rbac';

describe('canonical cockpit module registry', () => {
    it('uses foundation modules as the only primary sidebar source', () => {
        const primary = getPrimaryNavigationModules();

        expect(primary.map((item) => item.id)).toEqual([
            'cockpit',
            'gestao-ecommerce',
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

    it('registers ecommerce once as a Core route immediately after cockpit', () => {
        const primary = getPrimaryNavigationModules();
        const ecommerce = findModuleForPath('/cockpit/gestao-ecommerce');

        expect(ecommerce?.id).toBe('gestao-ecommerce');
        expect(ecommerce?.route).toBe('/cockpit/gestao-ecommerce');
        expect(ecommerce?.routes).toEqual([
            { pattern: '/cockpit/gestao-ecommerce', title: 'Gestão de E-commerce' },
        ]);
        expect(ecommerce?.requiredRoles).toEqual(['admin', 'manager', 'operator', 'viewer']);
        expect(ecommerce?.authModule).toBe('cockpit');
        expect(ecommerce?.navGroup).toBe('Core');
        expect(ecommerce?.navOrder).toBe(15);
        expect(ecommerce?.navVisible).toBe(true);
        expect(primary.findIndex((item) => item.id === 'gestao-ecommerce'))
            .toBe(primary.findIndex((item) => item.id === 'cockpit') + 1);
        expect(primary.filter((item) => item.id === 'gestao-ecommerce')).toHaveLength(1);
        expect(MODULES.filter((item) => item.route === '/cockpit/gestao-ecommerce')).toHaveLength(1);
        expect(MODULES.some((item) => item.group === 'Legacy' &&
            (item.id === 'gestao-ecommerce' || item.route === '/cockpit/gestao-ecommerce'))).toBe(false);
        expect(isModuleAuthorized(ecommerce!, 'unknown', false).authorized).toBe(false);
    });

    it.each(['admin', 'manager', 'operator', 'viewer'])('allows the %s profile to consult ecommerce', (role) => {
        const ecommerce = findModuleForPath('/cockpit/gestao-ecommerce');

        expect(ecommerce?.id).toBe('gestao-ecommerce');
        expect(isModuleAuthorized(ecommerce!, role, false)).toEqual({ authorized: true, reason: 'ok' });
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
