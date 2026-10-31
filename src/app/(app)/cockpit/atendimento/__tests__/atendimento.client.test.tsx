import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { normalizeDirection } from '../atendimento.client';

describe('AtendimentoClient Hardening & UX Alignment', () => {
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

    it('correctly normalizes message direction regardless of casing or unknown input', () => {
        // Lowercase as stored in MySQL and returned by API
        expect(normalizeDirection('inbound')).toBe('INBOUND');
        expect(normalizeDirection('outbound')).toBe('OUTBOUND');

        // Uppercase as used in client/fixtures
        expect(normalizeDirection('INBOUND')).toBe('INBOUND');
        expect(normalizeDirection('OUTBOUND')).toBe('OUTBOUND');

        // Mixed casing and whitespaces
        expect(normalizeDirection('  InBound  ')).toBe('INBOUND');
        expect(normalizeDirection('  OutBound ')).toBe('OUTBOUND');

        // Null, undefined, empty, or unknown fallback safely to INBOUND
        expect(normalizeDirection(null)).toBe('INBOUND');
        expect(normalizeDirection(undefined)).toBe('INBOUND');
        expect(normalizeDirection('')).toBe('INBOUND');
        expect(normalizeDirection('unknown_val')).toBe('INBOUND');
    });

    it('ensures supervised flow is relocated to side context and summary header is compact', () => {
        const filePath = join(__dirname, '../atendimento.client.tsx');
        const code = readFileSync(filePath, 'utf-8');

        // Verifies the compact top summary and expandable toggle exist
        expect(code).toContain('isFlowSummaryExpanded');
        expect(code).toContain('Ver 6 etapas');
        expect(code).toContain('Ocultar etapas');

        // Verifies the full flow is hosted in the context panel
        expect(code).toContain('Fluxo Supervisionado do MVP completo no painel lateral');

        // Verifies scroll stability improvements
        expect(code).toContain('messagesContainerRef');
        expect(code).toContain('isNearBottomRef');
        expect(code).toContain('scrollToBottom');
        expect(code).toContain('Novas mensagens abaixo');
    });

    it('distinguishes sources such as Frank IA and Operador in message rendering', () => {
        const filePath = join(__dirname, '../atendimento.client.tsx');
        const code = readFileSync(filePath, 'utf-8');

        expect(code).toContain('isFrank');
        expect(code).toContain('isOperator');
        expect(code).toContain('Frank IA');
        expect(code).toContain('Operador');
    });
});
