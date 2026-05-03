import { describe, it, expect } from 'vitest';
import { formatProductInquiryResponse, formatProductSuggestions } from '../whatsapp-response';
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

    describe('formatProductSuggestions', () => {
        it('should return a not found message when the products array is empty', () => {
            const result = formatProductSuggestions([]);
            expect(result).toBe('Não encontrei um produto com esse nome no momento. Se quiser, me diga o SKU ou descreva o item com mais detalhe.');
        });

        it('should format a single product correctly', () => {
            const product: CatalogProductLookup = {
                id: '1',
                name: 'Produto Teste',
                sku: 'SKU123',
                price: 100.50,
                basePrice: 100.50,
                categoryId: 'cat1',
                status: 'active'
            };
            const result = formatProductSuggestions([product]);
            expect(result).toContain('1. Produto Teste | SKU SKU123 | R$ 100,50');
            expect(result).toContain('Encontrei estas opções:');
            expect(result).toContain('Me confirme o modelo desejado e, se quiser o frete, envie também o CEP.');
        });

        it('should format up to 3 products correctly', () => {
            const products: CatalogProductLookup[] = [
                { id: '1', name: 'Produto 1', sku: 'SKU1', price: 10, basePrice: 10, categoryId: 'cat1', status: 'active' },
                { id: '2', name: 'Produto 2', sku: 'SKU2', price: 20, basePrice: 20, categoryId: 'cat1', status: 'active' },
                { id: '3', name: 'Produto 3', sku: 'SKU3', price: 30, basePrice: 30, categoryId: 'cat1', status: 'active' },
                { id: '4', name: 'Produto 4', sku: 'SKU4', price: 40, basePrice: 40, categoryId: 'cat1', status: 'active' },
            ];
            const result = formatProductSuggestions(products);
            expect(result).toContain('1. Produto 1 | SKU SKU1 | R$ 10,00');
            expect(result).toContain('2. Produto 2 | SKU SKU2 | R$ 20,00');
            expect(result).toContain('3. Produto 3 | SKU SKU3 | R$ 30,00');
            expect(result).not.toContain('4. Produto 4');
        });

        it('should handle products with missing sku or price gracefully', () => {
            const products: CatalogProductLookup[] = [
                { id: '1', name: 'Produto Sem SKU', price: 10.99, basePrice: 10.99, categoryId: 'cat1', status: 'active' },
                { id: '2', name: 'Produto Sem Preço', sku: 'SKU-NO-PRICE', categoryId: 'cat1', status: 'active' },
                { id: '3', name: 'Produto Simples', categoryId: 'cat1', status: 'active' },
            ];
            const result = formatProductSuggestions(products);
            expect(result).toContain('1. Produto Sem SKU | R$ 10,99');
            expect(result).toContain('2. Produto Sem Preço | SKU SKU-NO-PRICE');
            expect(result).toContain('3. Produto Simples');
        });

        it('should prioritize basePrice over price when both are provided and basePrice > 0', () => {
            const product: CatalogProductLookup = {
                id: '1',
                name: 'Produto com Preço Base',
                sku: 'SKU-BASE',
                price: 50.00,
                basePrice: 80.00,
                categoryId: 'cat1',
                status: 'active'
            };
            const result = formatProductSuggestions([product]);
            expect(result).toContain('1. Produto com Preço Base | SKU SKU-BASE | R$ 80,00');
        });

        it('should fall back to price when basePrice is 0 or undefined', () => {
            const product1: CatalogProductLookup = {
                id: '1',
                name: 'Produto com Preço 1',
                sku: 'SKU-PRICE-1',
                price: 50.00,
                basePrice: 0,
                categoryId: 'cat1',
                status: 'active'
            };
            const product2: CatalogProductLookup = {
                id: '2',
                name: 'Produto com Preço 2',
                sku: 'SKU-PRICE-2',
                price: 60.00,
                categoryId: 'cat1',
                status: 'active'
            };
            const result = formatProductSuggestions([product1, product2]);
            expect(result).toContain('1. Produto com Preço 1 | SKU SKU-PRICE-1 | R$ 50,00');
            expect(result).toContain('2. Produto com Preço 2 | SKU SKU-PRICE-2 | R$ 60,00');
        });
    });
});
