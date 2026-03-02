import { describe, it, expect } from 'vitest';
import { ALL_STATUSES, ORDER_STATUS, FINANCE_STATUS, SUPPORT_STATUS } from '@/domain/status/status-dictionary';

describe('Status Dictionary', () => {
    it('ALL_STATUSES should contain all defined domain statuses', () => {
        const expectedCount = Object.keys(ORDER_STATUS).length + Object.keys(FINANCE_STATUS).length + Object.keys(SUPPORT_STATUS).length;
        expect(ALL_STATUSES.length).toBe(expectedCount);
    });

    it('ALL_STATUSES should not contain any duplicates', () => {
        const uniqueStatuses = new Set(ALL_STATUSES);
        expect(uniqueStatuses.size).toBe(ALL_STATUSES.length);
    });

    it('Mappings exist for core flows', () => {
        expect(ORDER_STATUS.QUOTE_IN_PROGRESS).toBe('QUOTE_IN_PROGRESS');
        expect(FINANCE_STATUS.INVOICE_OPEN).toBe('INVOICE_OPEN');
        expect(SUPPORT_STATUS.SUPPORT_RESOLVED).toBe('SUPPORT_RESOLVED');
    });
});
