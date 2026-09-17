/**
 * webhook-canonical-delegation.test.ts (issue #395)
 *
 * Vigia estático da consolidação de webhooks: garante que os paths legados
 * são adapters finos (re-export) sem lógica duplicada, e que cada provedor
 * tem implementação única no namespace canônico `src/app/api/webhooks/`.
 * Sem imports de runtime (só leitura de arquivo) — não precisa de mocks.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const LEGACY_ADAPTERS: Array<{ legacy: string; canonicalFragment: string }> = [
    { legacy: 'src/app/api/webhook/stripe/route.ts', canonicalFragment: '../../webhooks/stripe/route' },
    { legacy: 'src/app/api/whatsapp/incoming/route.ts', canonicalFragment: '../../webhooks/whatsapp/incoming/route' },
    { legacy: 'src/app/api/whatsapp/status/route.ts', canonicalFragment: '../../webhooks/whatsapp/status/route' },
    { legacy: 'src/app/api/webhook/fallback/route.ts', canonicalFragment: '../../webhooks/whatsapp/fallback/route' },
];

const CANONICAL = [
    'src/app/api/webhooks/stripe/route.ts',
    'src/app/api/webhooks/whatsapp/incoming/route.ts',
    'src/app/api/webhooks/whatsapp/status/route.ts',
    'src/app/api/webhooks/whatsapp/fallback/route.ts',
    'src/app/api/webhooks/melhor-envio/route.ts',
];

// Tokens que indicam lógica real de webhook (não podem existir nos adapters).
const LOGIC_TOKENS = [
    'verifyStripeSignature',
    'verifyTwilioSignature',
    'verifyTwilioRequest',
    'verifyMelhorEnvioWebhook',
    'constructEvent',
    'registerWebhookEvent',
    'withDistributedLock',
    'async function POST',
    'export async function POST',
];

describe('webhooks canonical delegation (issue #395)', () => {
    it('cada handler canônico existe com implementação única', () => {
        for (const file of CANONICAL) {
            expect(fs.existsSync(path.join(ROOT, file)), `${file} deve existir`).toBe(true);
            expect(read(file), `${file} deve exportar POST`).toContain('POST');
        }
        // Melhor Envio permanece implementação única (sem duplicata).
        expect(read('src/app/api/webhooks/melhor-envio/route.ts')).toContain('verifyMelhorEnvioWebhook');
    });

    it.each(LEGACY_ADAPTERS)('$legacy delega ao canônico sem lógica duplicada', ({ legacy, canonicalFragment }) => {
        expect(fs.existsSync(path.join(ROOT, legacy)), `${legacy} deve existir como adapter`).toBe(true);
        const content = read(legacy);
        expect(content).toContain(canonicalFragment);
        expect(content).toContain('export { POST');
        for (const token of LOGIC_TOKENS) {
            expect(content, `${legacy} não deve conter lógica (${token})`).not.toContain(token);
        }
    });
});
