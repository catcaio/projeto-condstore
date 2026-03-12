import { describe, it, expect } from 'vitest';
import { rooms } from '../rooms.registry';

describe('rooms.registry', () => {
    it('should have at least one room configured', () => {
        expect(rooms.length).toBeGreaterThan(0);
    });

    it('all rooms must have id, label, description and icon', () => {
        for (const room of rooms) {
            expect(room.id).toBeDefined();
            expect(room.label).toBeDefined();
            expect(room.description).toBeDefined();
            expect(room.icon).toBeDefined();
        }
    });

    it('must have operacao room', () => {
        const operacao = rooms.find(r => r.id === 'operacao');
        expect(operacao).toBeDefined();
        expect(operacao?.label).toBe('Operação');
    });
});
