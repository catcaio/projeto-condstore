import { describe, it, expect } from 'vitest';
import {
    resolveEntities,
    detectedEntityTypes,
    missingEntityTypes,
    type ExtractedEntities,
} from '../entity-resolver';

describe('Entity Resolver', () => {
    describe('resolveEntities', () => {
        it('should extract product and volume from "qual o valor da lixeira 240L"', () => {
            const result = resolveEntities('qual o valor da lixeira 240L');
            expect(result.entities.product).toContain('lixeira');
            expect(result.entities.volume).toBe(240);
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should extract product and quantity from "3 carrinhos de supermercado"', () => {
            const result = resolveEntities('3 carrinhos de supermercado');
            expect(result.entities.quantity).toBe(3);
            expect(result.entities.product).toContain('carrinho');
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should extract orderId from "pedido 25860"', () => {
            const result = resolveEntities('pedido 25860');
            expect(result.entities.orderId).toBe('25860');
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should extract orderId with # prefix from "pedido #25860"', () => {
            const result = resolveEntities('pedido #25860');
            expect(result.entities.orderId).toBe('25860');
        });

        it('should extract documentType from "segunda via do boleto"', () => {
            const result = resolveEntities('segunda via do boleto');
            expect(result.entities.documentType).toBe('boleto');
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should extract documentType nota from "me envia a nota fiscal"', () => {
            const result = resolveEntities('me envia a nota fiscal');
            expect(result.entities.documentType).toBe('nota');
        });

        it('should extract orderId and documentType from "segunda via do boleto do pedido 25860"', () => {
            const result = resolveEntities('segunda via do boleto do pedido 25860');
            expect(result.entities.orderId).toBe('25860');
            expect(result.entities.documentType).toBe('boleto');
            expect(result.confidence).toBeGreaterThanOrEqual(0.63);
        });

        it('should extract UUID-like orderId', () => {
            const result = resolveEntities('pedido a1b2c3d4-e5f6-7890-abcd-ef1234567890');
            expect(result.entities.orderId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
        });

        it('should return zero confidence for empty message', () => {
            const result = resolveEntities('');
            expect(result.confidence).toBe(0);
            expect(result.entities.product).toBeNull();
        });

        it('should return low confidence for ambiguous "qual o valor?"', () => {
            const result = resolveEntities('qual o valor?');
            // No product specified — entities should be mostly empty
            expect(result.entities.orderId).toBeNull();
            expect(result.entities.quantity).toBeNull();
        });

        it('should extract product from "quanto custa o container 1000l"', () => {
            const result = resolveEntities('quanto custa o container 1000l');
            expect(result.entities.product).toContain('container');
            expect(result.entities.volume).toBe(1000);
        });

        it('should extract quantity from "preciso de 5 lixeiras"', () => {
            const result = resolveEntities('preciso de 5 lixeiras');
            expect(result.entities.quantity).toBe(5);
        });
    });

    describe('detectedEntityTypes', () => {
        it('should list detected types', () => {
            const entities: ExtractedEntities = {
                product: 'lixeira 240L',
                quantity: null,
                volume: 240,
                orderId: null,
                documentType: null,
            };
            expect(detectedEntityTypes(entities)).toEqual(['product', 'volume']);
        });

        it('should return empty list when nothing detected', () => {
            const entities: ExtractedEntities = {
                product: null,
                quantity: null,
                volume: null,
                orderId: null,
                documentType: null,
            };
            expect(detectedEntityTypes(entities)).toEqual([]);
        });
    });

    describe('missingEntityTypes', () => {
        it('should list missing expected types', () => {
            const entities: ExtractedEntities = {
                product: null,
                quantity: null,
                volume: null,
                orderId: '25860',
                documentType: null,
            };
            expect(missingEntityTypes(entities, ['product', 'orderId'])).toEqual(['product']);
        });
    });
});
