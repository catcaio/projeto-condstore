import { describe, it, expect } from 'vitest';
import { CreatePlaybookFromIntentDTOSchema } from '../../intent-linker/intent-linker.types';

describe('Playbooks Validation Limits (Hardening)', () => {
    it('should pass with valid sizes', () => {
        const payload = {
            name: 'Valid Playbook Name',
            intent: 'BUY',
            responseBase: 'Here is what you need.',
            status: 'draft',
            priority: 1
        };
        const result = CreatePlaybookFromIntentDTOSchema.safeParse(payload);
        expect(result.success).toBe(true);
    });

    it('should block extremely long strings on restricted fields', () => {
        const payload = {
            name: 'A'.repeat(150), // over 100 limit
            description: 'D'.repeat(600), // over 500 limit
            intent: 'BUY',
            responseBase: 'R',
            status: 'draft'
        };
        const result = CreatePlaybookFromIntentDTOSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some(i => i.path.includes('name'))).toBe(true);
            expect(result.error.issues.some(i => i.path.includes('description'))).toBe(true);
        }
    });

    it('should block array limits on logic tags', () => {
        const payload = {
            name: 'Valid',
            intent: 'Valid',
            responseBase: 'Valid',
            tags: Array(30).fill('tag'), // limit is 20
        };
        const result = CreatePlaybookFromIntentDTOSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some(i => i.path.includes('tags'))).toBe(true);
        }
    });
});
