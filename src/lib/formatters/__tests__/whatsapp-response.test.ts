import { describe, it, expect } from 'vitest';
import { formatProductInquiryResponse } from '../whatsapp-response';
import type { CatalogProductLookup } from '@/modules/catalog/catalog.service';

describe('whatsapp-response', () => {
    describe('formatProductInquiryResponse', () => {
        it('formats product with base price and sku', () => {
            const product = {
                name: 'Notebook Pro',
                sku: 'NB-123',
                basePrice: 5000,
                price: 0
            } as CatalogProductLookup;

            const response = formatProductInquiryResponse(product);
            expect(response).toBe('Temos Notebook Pro disponível. SKU: NB-123. Valor base: R$ 5000,00.');
        });

        it('formats product with regular price when base price is 0', () => {
            const product = {
                name: 'Notebook Pro',
                sku: 'NB-123',
                basePrice: 0,
                price: 5000
            } as CatalogProductLookup;

            const response = formatProductInquiryResponse(product);
            expect(response).toBe('Temos Notebook Pro disponível. SKU: NB-123. Valor base: R$ 5000,00.');
        });

        it('formats product without sku', () => {
            const product = {
                name: 'Notebook Pro',
                sku: null,
                basePrice: 5000,
                price: 0
            } as CatalogProductLookup;

            const response = formatProductInquiryResponse(product);
            expect(response).toBe('Temos Notebook Pro disponível. Valor base: R$ 5000,00.');
        });

        it('formats product without price', () => {
            const product = {
                name: 'Notebook Pro',
                sku: 'NB-123',
                basePrice: 0,
                price: 0
            } as CatalogProductLookup;

            const response = formatProductInquiryResponse(product);
            expect(response).toBe('Temos Notebook Pro disponível. SKU: NB-123.');
        });

        it('formats product without sku and without price', () => {
            const product = {
                name: 'Notebook Pro',
                sku: null,
                basePrice: 0,
                price: 0
            } as CatalogProductLookup;

            const response = formatProductInquiryResponse(product);
            expect(response).toBe('Temos Notebook Pro disponível.');
        });
    });
});
