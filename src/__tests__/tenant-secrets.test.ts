/**
 * Tenant Secrets Provider — Auditoria e Validação
 *
 * Cobertura:
 * - Isolamento cross-tenant (A não acessa B)
 * - Criptografia: banco não armazena plaintext
 * - Descriptografia: secret recuperado corretamente
 * - Falha segura: secret inválido / ausente
 * - Idempotência: upsert não duplica registros
 * - Segurança: secret nunca aparece em log ou throw
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenantSecretsRepository } from '../infra/repositories/tenant-secrets.repository';
import { secretResolver } from '../infra/security/secret-resolver';
import { encryptSecret, decryptSecret } from '../infra/security/encryption';
import { randomUUID } from 'crypto';

vi.mock('../infra/db', () => ({
    getDb: vi.fn()
}));

const mockDbStore = new Map<string, any>();

vi.mock('../infra/repositories/tenant-secrets.repository', () => ({
    tenantSecretsRepository: {
        getByKeyName: vi.fn(async (tenantId: string, scope: string, keyName: string) => {
            const key = `${tenantId}:${scope}:${keyName}`;
            return mockDbStore.get(key);
        }),
        upsertSecret: vi.fn(async (data: any) => {
            // Simulate unique key on (tenantId, scope, keyName) — upsert overwrites
            const key = `${data.tenantId}:${data.scope}:${data.keyName}`;
            mockDbStore.set(key, data);
        }),
    }
}));

describe('Tenant Secrets Provider — Full Audit', () => {
    beforeEach(() => {
        mockDbStore.clear();
        vi.clearAllMocks();
        process.env.TEST_FALLBACK_ENV = 'fallback_value';
        process.env.SECRETS_MASTER_KEY = '12345678901234567890123456789012';
        // Remove any residual env vars to avoid cross-test pollution
        delete process.env.FALLBACK;
        delete process.env.NOT_FOUND;
        delete process.env.MISSING_ENV;
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Criptografia
    // ──────────────────────────────────────────────────────────────────────────
    describe('Encryption', () => {
        it('should produce ciphertext different from plaintext', () => {
            const plain = 'my-secret-token-123';
            const encrypted = encryptSecret(plain);
            expect(encrypted).not.toBe(plain);
            expect(encrypted).not.toContain(plain);
        });

        it('should produce format iv:authTag:payload (3 parts)', () => {
            const encrypted = encryptSecret('test-value');
            const parts = encrypted.split(':');
            expect(parts.length).toBe(3);
            expect(parts[0].length).toBeGreaterThan(0); // iv
            expect(parts[1].length).toBeGreaterThan(0); // authTag
            expect(parts[2].length).toBeGreaterThan(0); // ciphertext
        });

        it('should produce different ciphertext on each call (random IV)', () => {
            const plain = 'same-input';
            const enc1 = encryptSecret(plain);
            const enc2 = encryptSecret(plain);
            expect(enc1).not.toBe(enc2); // different IVs → different output
        });

        it('should correctly decrypt what was encrypted', () => {
            const plain = 'round-trip-test';
            const encrypted = encryptSecret(plain);
            const decrypted = decryptSecret(encrypted);
            expect(decrypted).toBe(plain);
        });

        it('should throw on tampered ciphertext (GCM auth tag fails)', () => {
            const encrypted = encryptSecret('my-secret');
            const [iv, tag, cipher] = encrypted.split(':');
            const tampered = `${iv}:${tag}:AAAAAAAAAAAAAAAA`;
            expect(() => decryptSecret(tampered)).toThrow();
        });

        it('should throw on invalid format (not 3 parts)', () => {
            expect(() => decryptSecret('invalid-format')).toThrow('Invalid encrypted secret format');
            expect(() => decryptSecret('')).not.toThrow(); // empty returns ''
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Isolamento Multi-Tenant
    // ──────────────────────────────────────────────────────────────────────────
    describe('Tenant Isolation', () => {
        it('Tenant A must not read Tenant B secret', async () => {
            const tenantA = randomUUID();
            const tenantB = randomUUID();

            await tenantSecretsRepository.upsertSecret({
                id: randomUUID(), tenantId: tenantA, scope: 'twilio',
                keyName: 'TWILIO_AUTH_TOKEN',
                valueEncrypted: encryptSecret('token_of_A'),
                valueHash: 'hashA', lastRotatedAt: new Date()
            });

            await tenantSecretsRepository.upsertSecret({
                id: randomUUID(), tenantId: tenantB, scope: 'twilio',
                keyName: 'TWILIO_AUTH_TOKEN',
                valueEncrypted: encryptSecret('token_of_B'),
                valueHash: 'hashB', lastRotatedAt: new Date()
            });

            const resA = await secretResolver.getValue(tenantA, 'twilio', 'TWILIO_AUTH_TOKEN', 'NOT_FOUND');
            const resB = await secretResolver.getValue(tenantB, 'twilio', 'TWILIO_AUTH_TOKEN', 'NOT_FOUND');

            expect(resA).toBe('token_of_A');
            expect(resB).toBe('token_of_B');
            expect(resA).not.toBe(resB);
        });

        it('Tenant A querying missing key must not receive Tenant B data via fallback', async () => {
            const tenantA = randomUUID();
            const tenantB = randomUUID();

            await tenantSecretsRepository.upsertSecret({
                id: randomUUID(), tenantId: tenantB, scope: 'melhorenvio',
                keyName: 'MELHOR_ENVIO_TOKEN',
                valueEncrypted: encryptSecret('b_private_token'),
                valueHash: 'hash', lastRotatedAt: new Date()
            });

            // Tenant A does NOT have this key in DB
            // Fallback env also does not exist
            await expect(
                secretResolver.getValue(tenantA, 'melhorenvio', 'MELHOR_ENVIO_TOKEN', 'NOT_EXISTING_ENV_KEY')
            ).rejects.toThrow();
        });

        it('Two tenants with same scope/keyName get independent values', async () => {
            const SCOPE = 'melhorenvio';
            const KEY = 'MELHOR_ENVIO_TOKEN';
            const tenants = [randomUUID(), randomUUID(), randomUUID()];
            const tokens = ['token_1', 'token_2', 'token_3'];

            for (let i = 0; i < tenants.length; i++) {
                await tenantSecretsRepository.upsertSecret({
                    id: randomUUID(), tenantId: tenants[i], scope: SCOPE, keyName: KEY,
                    valueEncrypted: encryptSecret(tokens[i]),
                    valueHash: 'hash', lastRotatedAt: new Date()
                });
            }

            for (let i = 0; i < tenants.length; i++) {
                const resolved = await secretResolver.getValue(tenants[i], SCOPE, KEY, 'NOT_FOUND');
                expect(resolved).toBe(tokens[i]);
            }
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Fallback e Erros
    // ──────────────────────────────────────────────────────────────────────────
    describe('Fallback and Error Safety', () => {
        it('should fallback to env when secret is not in DB', async () => {
            const tenantId = randomUUID();
            const resolved = await secretResolver.resolve(tenantId, 'test', 'MISSING_DB_KEY', 'TEST_FALLBACK_ENV');
            expect(resolved.source).toBe('ENV');
            expect(resolved.value).toBe('fallback_value');
        });

        it('should throw a safe error when secret is missing from both DB and ENV', async () => {
            const tenantId = randomUUID();
            await expect(
                secretResolver.resolve(tenantId, 'test', 'MISSING', 'MISSING_ENV')
            ).rejects.toThrow(/missing from ENV/);
        });

        it('error message must NOT contain any secret value', async () => {
            const tenantId = randomUUID();
            try {
                await secretResolver.resolve(tenantId, 'test', 'NO_KEY', 'NO_ENV');
            } catch (err: any) {
                // The error message must only contain key names, never values
                expect(err.message).not.toContain('Bearer');
                expect(err.message).not.toContain('token');
                expect(err.message).toContain('NO_ENV');
            }
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Idempotência
    // ──────────────────────────────────────────────────────────────────────────
    describe('Idempotency (upsert)', () => {
        it('upserting same key twice should overwrite, not duplicate', async () => {
            const tenantId = randomUUID();

            await tenantSecretsRepository.upsertSecret({
                id: randomUUID(), tenantId, scope: 'twilio', keyName: 'TWILIO_AUTH_TOKEN',
                valueEncrypted: encryptSecret('first_token'),
                valueHash: 'hash1', lastRotatedAt: new Date()
            });

            await tenantSecretsRepository.upsertSecret({
                id: randomUUID(), tenantId, scope: 'twilio', keyName: 'TWILIO_AUTH_TOKEN',
                valueEncrypted: encryptSecret('second_token'),
                valueHash: 'hash2', lastRotatedAt: new Date()
            });

            // After double upsert, only the latest value should be returned
            const resolved = await secretResolver.getValue(tenantId, 'twilio', 'TWILIO_AUTH_TOKEN', 'NOT_FOUND');
            expect(resolved).toBe('second_token');

            // And the store should still have exactly 1 entry for this key
            const storeKey = `${tenantId}:twilio:TWILIO_AUTH_TOKEN`;
            expect(mockDbStore.has(storeKey)).toBe(true);
            // Map has only one entry per composite key
            const allKeysForTenant = Array.from(mockDbStore.keys()).filter(k => k.startsWith(tenantId));
            expect(allKeysForTenant.length).toBe(1);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Full end-to-end resolve cycle
    // ──────────────────────────────────────────────────────────────────────────
    describe('End-to-End Resolve Cycle', () => {
        it('encrypted DB value is resolved correctly through full cycle', async () => {
            const tenantId = randomUUID();
            const plainSecret = 'AC' + randomUUID().replace(/-/g, '');

            const encrypted = encryptSecret(plainSecret);

            await tenantSecretsRepository.upsertSecret({
                id: randomUUID(), tenantId, scope: 'twilio', keyName: 'TWILIO_ACCOUNT_SID',
                valueEncrypted: encrypted,
                valueHash: 'hash', lastRotatedAt: new Date()
            });

            const resolved = await secretResolver.resolve(tenantId, 'twilio', 'TWILIO_ACCOUNT_SID', 'NONE');
            expect(resolved.source).toBe('DB');
            expect(resolved.value).toBe(plainSecret);
        });
    });
});
