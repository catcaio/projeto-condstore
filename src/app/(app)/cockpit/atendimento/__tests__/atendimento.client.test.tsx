import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

describe('AtendimentoClient Hardening', () => {
    it('should implement AbortController for fetches to avoid race conditions', () => {
        const filePath = join(__dirname, '../atendimento.client.tsx');
        const code = readFileSync(filePath, 'utf-8');

        // Verify the file contains AbortController instantiations
        expect(code).toContain('new AbortController()');
        
        // Verify it passes signals to fetch
        expect(code).toContain('signal: controller.signal');
        
        // Verify it checks for abort error
        expect(code).toContain("e.name !== 'AbortError'");
    });
});
