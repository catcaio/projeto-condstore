import { describe, it, expect } from 'vitest';
import { createSpace, createProject, createTask } from '../services/governance.service';

describe('Governance Service', () => {
    it('should be defined', () => {
        expect(createSpace).toBeDefined();
        expect(createProject).toBeDefined();
        expect(createTask).toBeDefined();
    });
});
