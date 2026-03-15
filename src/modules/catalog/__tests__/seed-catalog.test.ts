import { describe, it, expect } from 'vitest';
import {
    LOJACOND_CATALOG,
    LOJACOND_TENANT_ID,
    validateCatalog,
    buildProductRows,
    makeProductId,
} from '../../../../scripts/seed-catalog';

describe('Seed Catalog', () => {
    describe('validateCatalog', () => {
        it('should validate the full Lojacond catalog without errors', () => {
            const result = validateCatalog(LOJACOND_CATALOG);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing SKU', () => {
            const result = validateCatalog([{ sku: '', name: 'Test', price: 10, weight: 1, width: 10, height: 10, length: 10 }]);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Missing SKU');
        });

        it('should detect invalid weight', () => {
            const result = validateCatalog([{ sku: 'X', name: 'Test', price: 10, weight: 0, width: 10, height: 10, length: 10 }]);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('weight');
        });

        it('should detect duplicate SKUs', () => {
            const result = validateCatalog([
                { sku: 'DUP', name: 'A', price: 10, weight: 1, width: 10, height: 10, length: 10 },
                { sku: 'DUP', name: 'B', price: 20, weight: 2, width: 20, height: 20, length: 20 },
            ]);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Duplicate SKU');
        });
    });

    describe('makeProductId', () => {
        it('should produce deterministic IDs', () => {
            const id1 = makeProductId('T1', 'SKU-A');
            const id2 = makeProductId('T1', 'SKU-A');
            expect(id1).toBe(id2);
        });

        it('should produce different IDs for different tenants', () => {
            const id1 = makeProductId('T1', 'SKU-A');
            const id2 = makeProductId('T2', 'SKU-A');
            expect(id1).not.toBe(id2);
        });

        it('should produce UUID-like format (8-4-4-4-12)', () => {
            const id = makeProductId('T1', 'SKU-A');
            expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
        });
    });

    describe('buildProductRows', () => {
        it('should generate rows for all catalog products', () => {
            const rows = buildProductRows(LOJACOND_TENANT_ID, LOJACOND_CATALOG);
            expect(rows.length).toBe(LOJACOND_CATALOG.length);
        });

        it('should set tenantId correctly on all rows', () => {
            const rows = buildProductRows(LOJACOND_TENANT_ID, LOJACOND_CATALOG);
            for (const row of rows) {
                expect(row.tenantId).toBe(LOJACOND_TENANT_ID);
            }
        });

        it('should have unique IDs for all rows', () => {
            const rows = buildProductRows(LOJACOND_TENANT_ID, LOJACOND_CATALOG);
            const ids = new Set(rows.map(r => r.id));
            expect(ids.size).toBe(rows.length);
        });

        it('should format numeric fields as strings', () => {
            const rows = buildProductRows(LOJACOND_TENANT_ID, LOJACOND_CATALOG);
            const first = rows[0];
            expect(typeof first.price).toBe('string');
            expect(typeof first.weight).toBe('string');
            expect(first.price).toMatch(/^\d+\.\d{2}$/);
            expect(first.weight).toMatch(/^\d+\.\d{3}$/);
        });
    });

    describe('catalog completeness', () => {
        it('should have at least 30 products', () => {
            expect(LOJACOND_CATALOG.length).toBeGreaterThanOrEqual(30);
        });

        it('should cover all major categories', () => {
            const names = LOJACOND_CATALOG.map(p => p.name.toLowerCase());
            expect(names.some(n => n.includes('container') || n.includes('lixeira'))).toBe(true);
            expect(names.some(n => n.includes('carrinho'))).toBe(true);
            expect(names.some(n => n.includes('correio'))).toBe(true);
            expect(names.some(n => n.includes('biciclet'))).toBe(true);
            expect(names.some(n => n.includes('mop'))).toBe(true);
        });
    });
});
