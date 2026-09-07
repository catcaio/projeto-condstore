import React from 'react';
import fs from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import OrdersClient from '../orders.client';

const source = fs.readFileSync(new URL('../orders.client.tsx', import.meta.url), 'utf8');

function countOccurrences(haystack: string, needle: string) {
    return haystack.split(needle).length - 1;
}

describe('OrdersClient status selector (regression)', () => {
    it('renders the loading state on first static pass', () => {
        const html = renderToStaticMarkup(<OrdersClient />);

        expect(html).toContain('Carregando pedidos');
    });

    it('declares exactly one status select template per order card', () => {
        // Single <select> template keyed by a unique per-order id
        expect(countOccurrences(source, 'id={`order-status-${item.id}`}')).toBe(1);
        expect(countOccurrences(source, '<select')).toBe(1);

        // No duplicated legacy selector ids from the buggy revision
        expect(countOccurrences(source, 'status-select-${item.id}')).toBe(0);
    });

    it('wires the selector for touch, keyboard and drag-safe interaction', () => {
        // Accessible label naming the order being changed
        expect(source).toContain('aria-label={`Alterar status do pedido ${item.id}`}');
        // Touch-friendly minimum target
        expect(source).toContain('min-h-[44px]');
        // Must not trigger card drag when interacting with the select
        expect(source).toContain('onClick={(e) => e.stopPropagation()}');
        // Delegates to the existing status update flow with every column option
        expect(source).toContain('onChange={(e) => updateStatus(item.id, e.target.value)}');
        expect(source).toContain('{COLUMNS.map((c) => (');
    });
});
