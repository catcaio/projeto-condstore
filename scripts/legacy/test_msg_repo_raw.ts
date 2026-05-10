import { getDb } from '../../src/infra/db';
import { messages } from '../../src/drizzle/schema';
import { hashPhoneForTenant } from '../../src/infra/pii/phone';
import { encryptString } from '../../src/infra/pii/crypto';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

function unwrapMysqlRows<T>(result: unknown): T[] {
    if (!Array.isArray(result)) return [];
    if (Array.isArray(result[0])) return result[0] as T[];
    return result as T[];
}

async function debugInsert() {
    try {
        const db = await getDb();
        const tenantRes = await db.execute(sql`SELECT id FROM tenants LIMIT 1`);
        const row: any = unwrapMysqlRows<any>(tenantRes)[0];
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
        const { fromPhone, ...restRecord } = record;
        const recordToPersist = {
            ...restRecord,
            fromPhoneHash: hash,
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
