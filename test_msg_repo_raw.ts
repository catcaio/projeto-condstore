import { getDb } from './src/infra/db';
import { messages } from './src/drizzle/schema';
import { hashPhoneForTenant } from './src/infra/pii/phone';
import { encryptString } from './src/infra/pii/crypto';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function debugInsert() {
    try {
        const db = await getDb();
        const tenantRes = await db.execute(sql`SELECT id FROM tenants LIMIT 1`);
        const row: any = (tenantRes.rows || tenantRes[0] || [])[0];
        const tenantId = row.id;
        
        const record = {
            messageSid: 'DEBUG-SID-' + Date.now(),
            tenantId,
            fromPhone: '+5511999998888',
            toPhone: '+14155238886',
            body: 'Direct DB Insert Test',
            direction: 'inbound' as const,
            intent: 'UNKNOWN',
            intentConfidence: null as any,
            rawPayload: JSON.stringify({ debug: true })
        };

        const { e164, hash } = hashPhoneForTenant(record.fromPhone, record.tenantId);
        const recordToPersist = {
            ...record,
            fromPhone: '[redacted]',
            phoneHash: hash,
            phoneEncrypted: encryptString(e164),
            toPhone: null as any,
            body: `[encrypted:${record.body.length}]`,
            bodyEncrypted: encryptString(record.body),
        };

        console.log('Inserting...', recordToPersist);
        await db.insert(messages).values(recordToPersist);
        console.log('Success!');
    } catch (e) {
        console.error('ERROR TRACE:', e);
    }
    process.exit(0);
}

debugInsert();
