import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('FreightQuotePanel operator flow hardening', () => {
    it('keeps approval explicit before order conversion and avoids blocking browser dialogs', () => {
        const filePath = join(__dirname, '../components/freight-quote-panel.tsx');
        const code = readFileSync(filePath, 'utf-8');

        expect(code).toContain('Registrar aprovacao');
        expect(code).toContain('Somente cotacoes aprovadas podem virar pedido.');
        expect(code).not.toContain('alert(');
        expect(code).not.toContain('confirm(');
        expect(code).not.toContain('window.location.reload(');
    });
});
