import { describe, it, expect } from 'vitest';
import { subrooms } from '../subrooms.registry';

describe('subrooms.registry', () => {
    it('should have multiple subrooms configured', () => {
        expect(subrooms.length).toBeGreaterThan(0);
    });

    it('all subrooms must have correct properties', () => {
        for (const sr of subrooms) {
            expect(sr.id).toBeDefined();
            expect(sr.roomId).toBeDefined();
            expect(sr.label).toBeDefined();
            expect(sr.description).toBeDefined();
            expect(sr.route).toBeDefined();
        }
    });

    it('operacao room should have inbox subroom pointed to atendimento', () => {
        const inbox = subrooms.find(sr => sr.roomId === 'operacao' && sr.id === 'inbox');
        expect(inbox).toBeDefined();
        expect(inbox?.route).toBe('/cockpit/atendimento');
    });

    it('subroom routes should be valid formats', () => {
        for (const sr of subrooms) {
            expect(sr.route.startsWith('/')).toBe(true);
        }
    });
});
