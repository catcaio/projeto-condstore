import { getDb } from './src/infra/db';
import { sql } from 'drizzle-orm';
import { messageRepository } from './src/infra/repositories/message.repository';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

function unwrapMysqlRows<T>(result: unknown): T[] {
    if (!Array.isArray(result)) return [];
    if (Array.isArray(result[0])) return result[0] as T[];
    return result as T[];
}

async function checkPersistence() {
    console.log('[*] Testing message save...');
    try {
        const db = await getDb();
        const tenantRes = await db.execute(sql`SELECT id FROM tenants LIMIT 1`);
        const row: any = unwrapMysqlRows<any>(tenantRes)[0];
        
        if (!row) throw new Error('No tenant found to test.');

        const tenantId = row.id;
        const msgSid = 'DEBUG-SID-' + Date.now();
        console.log(`[+] Using tenantId: ${tenantId}, messageSid: ${msgSid}`);

        await messageRepository.saveInboundMessage({
            messageSid: msgSid,
            tenantId,
            fromPhone: '+5511999998888',
            toPhone: '+14155238886',
            body: 'Isso é um teste direto no repositório LGPD.',
            direction: 'inbound',
            intent: 'UNKNOWN',
            intentConfidence: null,
            rawPayload: JSON.stringify({ debug: true })
        });
        
        console.log('[+] saveInboundMessage completed without throwing.');

        const verify = await db.execute(sql`SELECT message_sid FROM messages WHERE message_sid = ${msgSid}`);
        const saved: any = unwrapMysqlRows<any>(verify)[0];
        if (saved) {
            console.log('[SUCCESS] Message successfully saved to DB!');
        } else {
            console.log('[FAIL] Message was NOT saved to DB! Silent failure occurred in repository.');
        }
    } catch (e) {
        console.error('[FATAL]', e);
    }
    process.exit(0);
}

checkPersistence();
