import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));
const mockGetDb = vi.fn(async () => ({ select: mockSelect }));

vi.mock('@/infra/db', () => ({
    getDb: (...args: any[]) => mockGetDb(...args),
}));

vi.mock('@/drizzle/schema', () => ({
    freightOperationalSettings: {
        tenantId: 'tenantId',
        isActive: 'isActive',
    },
}));

import { invalidateSettingsCache, loadOperationalSettings } from '../operational-settings';

describe('loadOperationalSettings', () => {
    const tenantId = 'TENANT_A';

    beforeEach(() => {
        mockWhere.mockReset();
        mockFrom.mockClear();
        mockSelect.mockClear();
        mockGetDb.mockClear();
        invalidateSettingsCache(tenantId);
    });

    afterEach(() => {
        invalidateSettingsCache(tenantId);
    });

    it('returns tenant default_origin_cep when configured in DB', async () => {
        mockWhere.mockResolvedValueOnce([
            { settingKey: 'default_origin_cep', settingValue: '12345678', ruleVersion: 7 },
        ]);

        const settings = await loadOperationalSettings(tenantId);

        expect(settings.defaultOriginCep).toBe('12345678');
        expect(settings.ruleVersion).toBe(7);
    });

    it('returns empty origin when tenant has no default_origin_cep and ORIGIN_CEP is unset', async () => {
        delete process.env.ORIGIN_CEP;
        mockWhere.mockResolvedValueOnce([]);

        const settings = await loadOperationalSettings(tenantId);

        expect(settings.defaultOriginCep).toBe('');
        expect(settings.defaultOriginCep).not.toBe('01001000');
        expect(settings.defaultOriginCep).not.toBe('88131640');
    });
});
