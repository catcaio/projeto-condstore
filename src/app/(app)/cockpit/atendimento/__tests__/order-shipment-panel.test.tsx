import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('OrderShipmentPanel operator handoff hardening', () => {
    it('keeps order confirmation in the conversation flow with readable feedback', () => {
        const filePath = join(__dirname, '../components/order-shipment-panel.tsx');
        const code = readFileSync(filePath, 'utf-8');

        expect(code).toContain('Confirmar pedido e abrir shipment');
        expect(code).toContain("/api/cockpit/orders/${order.id}/status");
        expect(code).toContain("status: 'CONFIRMED'");
        expect(code).toContain('Pedido confirmado');
        expect(code).not.toContain('alert(');
    });
});
