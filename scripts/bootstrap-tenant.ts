/**
 * CONDSTORE OS — Tenant Bootstrap Script
 *
 * Creates a new Tenant and securely provisions all credentials
 * (Twilio and Melhor Envio) into the tenant_secrets table.
 *
 * Usage: npx tsx scripts/bootstrap-tenant.ts
 * Or CI: BOOTSTRAP_TWILIO_SID=... BOOTSTRAP_TWILIO_TOKEN=... npx tsx scripts/bootstrap-tenant.ts
 */

import { randomUUID, createHmac } from 'crypto';
import { getDb } from '../src/infra/db';
import { tenants } from '../src/drizzle/schema';
import { tenantSecretsRepository } from '../src/infra/repositories/tenant-secrets.repository';
import { encryptSecret } from '../src/infra/security/encryption';
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve));

/** Computes an HMAC-SHA256 of the encrypted blob for integrity tracking (not used for decryption). */
function hashEncrypted(encrypted: string): string {
    const key = process.env.SECRETS_MASTER_KEY || 'local_dev_fallback_hash_key';
    return createHmac('sha256', key).update(encrypted).digest('hex');
}

/** Encrypts and persists a single secret for a tenant. Idempotent via upsertSecret. */
async function saveSecret(tenantId: string, scope: string, keyName: string, value: string): Promise<void> {
    const encrypted = encryptSecret(value);
    await tenantSecretsRepository.upsertSecret({
        id: randomUUID(),
        tenantId,
        scope,
        keyName,
        valueEncrypted: encrypted,
        valueHash: hashEncrypted(encrypted),
        lastRotatedAt: new Date()
    });
}

async function main() {
    console.log('--- CONDSTORE OS: Tenant Bootstrap ---');
    console.log('This script creates a new Tenant and configures its operational secrets securely.\n');

    // ── Tenant Basics ────────────────────────────────────────────────────────────
    const tenantName = await question('Tenant Name: ');
    if (!tenantName.trim()) throw new Error('Tenant name is required.');

    const twilioNumber = await question('Twilio WhatsApp Number (ex: +5511999999999): ');
    if (!twilioNumber.trim()) throw new Error('Twilio number is required.');

    const tenantId = randomUUID();
    const db = await getDb();

    console.log(`\nCreating tenant [${tenantName}] with ID: ${tenantId}...`);
    await db.insert(tenants).values({
        id: tenantId,
        name: tenantName,
        twilioNumber: twilioNumber.trim(),
        timezone: 'America/Sao_Paulo',
        outboundEnabled: true,
        incidentMode: false
    });
    console.log('✅ Tenant record created.');

    // ── Twilio ───────────────────────────────────────────────────────────────────
    console.log('\n--- Twilio Configuration ---');
    const twilioSid = (await question('TWILIO_ACCOUNT_SID (or press Enter to skip): ')).trim()
        || process.env.BOOTSTRAP_TWILIO_SID;
    const twilioToken = (await question('TWILIO_AUTH_TOKEN (or press Enter to skip): ')).trim()
        || process.env.BOOTSTRAP_TWILIO_TOKEN;

    if (twilioSid && twilioToken) {
        await saveSecret(tenantId, 'twilio', 'TWILIO_ACCOUNT_SID', twilioSid);
        await saveSecret(tenantId, 'twilio', 'TWILIO_AUTH_TOKEN', twilioToken);
        await saveSecret(tenantId, 'twilio', 'TWILIO_PHONE_NUMBER', twilioNumber.trim());
        console.log('✅ Twilio secrets saved securely (encrypted).');
    } else {
        console.log('⚠️  Twilio configuration skipped — system will fallback to global .env.');
    }

    // ── Melhor Envio ─────────────────────────────────────────────────────────────
    console.log('\n--- Melhor Envio Configuration ---');
    const meToken = (await question('MELHOR_ENVIO_TOKEN (or press Enter to skip): ')).trim()
        || process.env.BOOTSTRAP_ME_TOKEN;

    if (meToken) {
        await saveSecret(tenantId, 'melhorenvio', 'MELHOR_ENVIO_TOKEN', meToken);
        console.log('✅ Melhor Envio token saved securely.');

        // Sender address fields (required for shipment creation)
        const mePostalCode = (await question('FROM_POSTAL_CODE (ex: 88000000): ')).trim()
            || process.env.BOOTSTRAP_ME_POSTAL_CODE || '';
        const meAddress = (await question('FROM_ADDRESS (ex: Rua das Flores): ')).trim()
            || process.env.BOOTSTRAP_ME_ADDRESS || 'Rua Principal';
        const meNumber = (await question('FROM_NUMBER (ex: 100): ')).trim()
            || process.env.BOOTSTRAP_ME_NUMBER || '100';
        const meDistrict = (await question('FROM_DISTRICT (ex: Centro): ')).trim()
            || process.env.BOOTSTRAP_ME_DISTRICT || 'Centro';
        const meCity = (await question('FROM_CITY (ex: Florianópolis): ')).trim()
            || process.env.BOOTSTRAP_ME_CITY || 'Florianópolis';
        const meState = (await question('FROM_STATE (ex: SC): ')).trim()
            || process.env.BOOTSTRAP_ME_STATE || 'SC';
        const meDoc = (await question('FROM_DOCUMENT — CPF (11 digits, or press Enter to skip): ')).trim()
            || process.env.BOOTSTRAP_ME_DOCUMENT || '';
        const meCnpj = (await question('FROM_COMPANY_DOCUMENT — CNPJ (14 digits, or press Enter to skip): ')).trim()
            || process.env.BOOTSTRAP_ME_CNPJ || '';

        // Persist all address/config secrets
        const configs: Array<{ key: string; val: string }> = [
            { key: 'MELHOR_ENVIO_FROM_NAME', val: tenantName },
            { key: 'MELHOR_ENVIO_FROM_EMAIL', val: 'contato@condstore.com.br' },
            { key: 'MELHOR_ENVIO_FROM_PHONE', val: '48999999999' },
        ];
        if (mePostalCode) configs.push({ key: 'MELHOR_ENVIO_FROM_POSTAL_CODE', val: mePostalCode });
        if (meAddress)    configs.push({ key: 'MELHOR_ENVIO_FROM_ADDRESS', val: meAddress });
        if (meNumber)     configs.push({ key: 'MELHOR_ENVIO_FROM_NUMBER', val: meNumber });
        if (meDistrict)   configs.push({ key: 'MELHOR_ENVIO_FROM_DISTRICT', val: meDistrict });
        if (meCity)       configs.push({ key: 'MELHOR_ENVIO_FROM_CITY', val: meCity });
        if (meState)      configs.push({ key: 'MELHOR_ENVIO_FROM_STATE', val: meState });
        if (meDoc)        configs.push({ key: 'MELHOR_ENVIO_FROM_DOCUMENT', val: meDoc.replace(/\D/g, '') });
        if (meCnpj)       configs.push({ key: 'MELHOR_ENVIO_FROM_COMPANY_DOCUMENT', val: meCnpj.replace(/\D/g, '') });

        for (const cfg of configs) {
            await saveSecret(tenantId, 'melhorenvio', cfg.key, cfg.val);
        }
        console.log(`✅ Melhor Envio address config saved securely (${configs.length} fields).`);
    } else {
        console.log('⚠️  Melhor Envio configuration skipped — system will fallback to global .env.');
    }

    // ── Done ─────────────────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════');
    console.log(`✅ Tenant [${tenantName}] bootstrap completed successfully!`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log('   All secrets are encrypted at rest (AES-256-GCM).');
    console.log('   No plaintext credentials were stored or logged.');
    console.log('════════════════════════════════════════\n');

    rl.close();
    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ Bootstrap failed:', err.message || err);
    rl.close();
    process.exit(1);
});
