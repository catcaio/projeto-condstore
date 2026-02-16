
import * as dotenv from 'dotenv';
dotenv.config();

import { tenantRepository } from '../src/infra/repositories/tenant.repository';
import { normalizeWhatsAppNumber } from '../src/lib/normalize';

async function runDiagnostics() {
    console.log('\n=== TENANT RESOLUTION DIAGNOSTICS ===\n');

    // 1. Environment Check
    const envNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    const dbUrl = process.env.DATABASE_URL;

    console.log('[1] Environment Check:');
    console.log(`    TWILIO_WHATSAPP_NUMBER: ${envNumber}`);
    console.log(`    DATABASE_URL configured: ${!!dbUrl}`);

    if (!dbUrl) {
        console.error('CRITICAL: DATABASE_URL is missing.');
        process.exit(1);
    }

    if (!envNumber) {
        console.error('CRITICAL: TWILIO_WHATSAPP_NUMBER is missing.');
        process.exit(1);
    }

    // 2. Normalization Check
    console.log('\n[2] Normalization Check:');
    const scenarios = [
        envNumber,
        'whatsapp:+14155238886',
        ' whatsapp: +14155238886 ',
        '+14155238886', // Should add prefix
        '14155238886'   // Should add prefix + plus
    ];

    scenarios.forEach(input => {
        const normalized = normalizeWhatsAppNumber(input);
        console.log(`    Input: "${input}"`.padEnd(30) + `-> Normalized: "${normalized}"`);
    });

    const targetNumber = normalizeWhatsAppNumber(envNumber);

    // 3. Database Connection & List All
    console.log('\n[3] Database Connection & Tenant List:');
    try {
        console.time('getAllTenants');
        const tenants = await tenantRepository.getAllTenants();
        console.timeEnd('getAllTenants');

        console.log(`    Found ${tenants.length} tenants in database.`);
        tenants.forEach(t => {
            console.log(`    - ID: ${t.id} | Name: ${t.name} | Number: "${t.twilioNumber}"`);
        });

        const match = tenants.find(t => t.twilioNumber === targetNumber);
        if (match) {
            console.log(`    ✅ DIRECT MATCH FOUND in memory list: ${match.id}`);
        } else {
            console.log(`    ❌ NO MATCH found in memory list for "${targetNumber}"`);
        }

    } catch (error) {
        console.error('    ❌ Failed to list tenants:', error);
        process.exit(1);
    }

    // 4. Resolve Method Check (The actual failure point)
    console.log('\n[4] Testing resolving method (getTenantByTwilioNumber):');
    try {
        console.log(`    Querying for: "${targetNumber}"`);

        console.time('resolveTenant');
        const tenant = await tenantRepository.resolveTenantByTwilioNumber(targetNumber);
        console.timeEnd('resolveTenant');

        if (tenant) {
            console.log(`    ✅ Tenant resolved successfully:`);
            console.log(`       ID: ${tenant.id}`);
            console.log(`       Name: ${tenant.name}`);
        } else {
            console.log(`    ⚠️ Tenant NOT found via repository method.`);
        }
    } catch (error) {
        console.error('    ❌ INTERNAL_ERROR during resolution:', error);
    }

    console.log('\n=== DIAGNOSTICS COMPLETE ===\n');
    process.exit(0);
}

runDiagnostics();
