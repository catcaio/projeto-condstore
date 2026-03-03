import { describe, it, expect } from 'vitest';
import { buildConversationKey, maskPhone, maskRefToken, deriveConversationStatus } from '../utils';

describe('buildConversationKey', () => {
    it('prioritizes normalized phone over refToken and isolate by tenantId', () => {
        const key1 = buildConversationKey({
            tenantId: 'tenantA',
            phoneRaw: ' +11 98765-4321 ',
            refToken: 'some-token'
        });
        expect(key1).toBe('tenantA:+11987654321');

        const key2 = buildConversationKey({
            tenantId: 'tenantB',
            phoneRaw: '+11987654321'
        });
        expect(key2).toBe('tenantB:+11987654321');

        expect(key1).not.toBe(key2); // different tenant
    });

    it('falls back to refToken when phone is unavailable', () => {
        const key = buildConversationKey({
            tenantId: 'tenantA',
            refToken: ' abc-123 '
        });
        expect(key).toBe('tenantA:ref:abc-123');
    });

    it('removes whatsapp: prefix and letters', () => {
        const key = buildConversationKey({
            tenantId: 't1',
            phoneRaw: 'whatsapp:+5511999991234'
        });
        expect(key).toBe('t1:+5511999991234');
    });

    it('throws if neither phone nor refToken is present', () => {
        expect(() => buildConversationKey({ tenantId: 't1' })).toThrowError(/Cannot build/);
    });
});

describe('maskPhone', () => {
    it('returns masked phone keeping the first chars and last 4', () => {
        expect(maskPhone('whatsapp:+5511999991234')).toBe('+55*******1234');
        expect(maskPhone('+5511987654321')).toBe('+55*******4321');
        expect(maskPhone('11987654321')).toBe('11*****4321');
    });

    it('handles short phones safely', () => {
        expect(maskPhone('123456')).toBe('12****');
        expect(maskPhone('+551')).toBe('+5**');
    });

    it('returns undefined for empty', () => {
        expect(maskPhone('')).toBeUndefined();
    });
});

describe('maskRefToken', () => {
    it('masks long tokens correctly', () => {
        expect(maskRefToken('abcdefghijk')).toBe('abc...ijk');
    });

    it('handles short tokens', () => {
        expect(maskRefToken('abcd')).toBe('***');
    });
});

describe('deriveConversationStatus', () => {
    it('returns closed if last activity is older than limit', () => {
        const now = new Date();
        const old = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
        expect(deriveConversationStatus(old).status).toBe('closed');
    });

    it('returns open when recent inbound exists with no outbound', () => {
        const now = new Date();
        const inb = new Date(now.getTime() - 10000);
        const { status, slaMinutes } = deriveConversationStatus(now, inb);
        expect(status).toBe('open');
        expect(typeof slaMinutes).toBe('number');
    });

    it('returns pending when outbound is newer than inbound', () => {
        const now = new Date();
        const inb = new Date(now.getTime() - 60000);
        const out = new Date(now.getTime() - 10000);
        const { status, slaMinutes } = deriveConversationStatus(now, inb, out);
        expect(status).toBe('pending');
        expect(slaMinutes).toBeUndefined();
    });

    it('returns open when inbound is newer than outbound', () => {
        const now = new Date();
        const out = new Date(now.getTime() - 60000);
        const inb = new Date(now.getTime() - 10000);
        const { status } = deriveConversationStatus(now, inb, out);
        expect(status).toBe('open');
    });
});
