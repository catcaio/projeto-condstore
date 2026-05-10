import crypto from 'crypto';
import { getDb } from '../../src/infra/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

const url = 'https://app.condstoreos.com/api/whatsapp/incoming';
const authToken = '482eb23a3f3e93ac41d7754c59626316';

function unwrapMysqlRows<T>(result: unknown): T[] {
    if (!Array.isArray(result)) return [];
    if (Array.isArray(result[0])) return result[0] as T[];
    return result as T[];
}

async function sendWebhook(toPhone: string, fromPhone: string, body: string, messageSid: string) {
    const params = {
        MessageSid: messageSid,
        AccountSid: 'TEST-ACCOUNT',
        From: fromPhone,
        To: toPhone,
        Body: body
    };

    const keys = Object.keys(params).sort();
    let data = url;
    for (const key of keys) {
        data += key + params[key as keyof typeof params];
    }
    const signature = crypto.createHmac('sha1', authToken).update(data).digest('base64');
    const formBody = new URLSearchParams(params).toString();

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Twilio-Signature': signature
        },
        body: formBody
    });
    return { status: res.status, text: await res.text() };
}

async function runTest() {
    console.log('--- TEST START ---');
    try {
        process.env.DATABASE_URL = 'mysql://3eVqVkwqvsPDeJw.root:nKuJXuSYrGovB2yB@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/lojacond?ssl={"rejectUnauthorized":true}';
        
        const db = await getDb();

        const toPhone = 'whatsapp:+14155238886';
        const fromPhone = 'whatsapp:+5511999999999';
        
        // Ensure the tenant has the Sandbox number
        const tenantsResult = await db.execute(sql`SELECT id, name, twilio_number FROM tenants LIMIT 1`);
        const dbTenants = unwrapMysqlRows<any>(tenantsResult);
        const tenant: any = dbTenants[0];
        
        if (!tenant) throw new Error('No tenant found in DB!');
        const tenantId = tenant.id;
        const originalTwilio = tenant.twilio_number || tenant.twilioNumber;

        await db.execute(sql`UPDATE tenants SET twilio_number = ${toPhone} WHERE id = ${tenantId}`);

        console.log(`[1] Injecting LGPD Consent text...`);
        let consentSid = 'TEST-LGPD-SID-' + Date.now();
        await sendWebhook(toPhone, fromPhone, "Sim", consentSid);
        
        console.log('[2] Wait 2 seconds...');
        await new Promise(r => setTimeout(r, 2000));

        const messageBody = 'quanto custa carrinho 140 litros';
        const messageSid = 'TEST-QA-SID-' + Date.now();

        console.log(`[3] Simulating webhook POST to ${url}...`);
        const result = await sendWebhook(toPhone, fromPhone, messageBody, messageSid);
        const { status, text } = result;
        
        console.log('[4] Wait 3 seconds...');
        await new Promise(r => setTimeout(r, 3000));

        let webhookOk = false;
        let conversationOk = false;
        let suggestionOk = false;
        let operationalEventsOk = false;

        let rootCause = "N/A";
        let fixSuggestion = "N/A";

        if (status === 200 && text.includes('<?xml')) {
            webhookOk = true;
        } else {
            rootCause = "Webhook ou TenantResolver auth falhou";
            fixSuggestion = "Garantir rotas configuradas corretamente e Tenant com número Twilio válido e webhook secret no ambiente.";
        }

        if (text.includes('Serviço indisponível')) {
            webhookOk = false;
            rootCause = "TenantResolver";
            fixSuggestion = "O TenantResolver falhou. Provavelmente o número To não está na base, ou o cache/DB teve erro.";
        } else if (text.includes('Para continuar, confirme que aceita nossa política de privacidade')) {
            webhookOk = true;
            rootCause = "LGPD bypass falhou";
            fixSuggestion = "Consentimento LGPD não foi processado a tempo da segunda mensagem.";
        }

        const msgsResult = await db.execute(sql`SELECT * FROM messages WHERE message_sid = ${messageSid}`);
        const qaMessage: any = unwrapMysqlRows<any>(msgsResult)[0];
        
        if (qaMessage) {
            let currentConversationId = qaMessage.conversation_id || qaMessage.conversationId;
            
            if (currentConversationId) {
                const convsResult = await db.execute(sql`SELECT * FROM conversations WHERE id = ${currentConversationId}`);
                let convs = unwrapMysqlRows<any>(convsResult);
                if (convs.length > 0) conversationOk = true;
            } else {
                const convsResult = await db.execute(sql`SELECT * FROM conversations WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 1`);
                const convs = unwrapMysqlRows<any>(convsResult);
                if (convs[0]) {
                    currentConversationId = convs[0].id;
                    conversationOk = true;
                }
            }

            if (currentConversationId) {
                let sug: any;
                try {
                    const sugResult = await db.execute(sql`SELECT * FROM frank_suggestions WHERE conversation_id = ${currentConversationId} ORDER BY created_at DESC LIMIT 1`);
                    sug = unwrapMysqlRows<any>(sugResult)[0];
                } catch (e:any) {
                    const sugResult = await db.execute(sql`SELECT * FROM suggestions WHERE conversation_id = ${currentConversationId} ORDER BY created_at DESC LIMIT 1`);
                    sug = unwrapMysqlRows<any>(sugResult)[0];
                }
                if (sug) {
                    suggestionOk = true;
                } else if (rootCause === "N/A") {
                    rootCause = "SuggestionService ou CatalogService";
                    fixSuggestion = "Verificar se as Entities foram extraídas e se o CatalogService encontrou produtos para 'carrinho 140 litros'.";
                }

                const eventsResult = await db.execute(sql`SELECT * FROM operational_events WHERE entity_id = ${currentConversationId}`);
                const events = unwrapMysqlRows<any>(eventsResult);
                
                const eventTypes = events.map((e: any) => e.event_type || e.eventType);
                
                if (eventTypes.includes('message_received') && eventTypes.includes('product_detected') && eventTypes.includes('suggestion_created')) {
                    operationalEventsOk = true;
                } else if (!operationalEventsOk && rootCause === "N/A") {
                    rootCause = "EventBus / Operational Events Falta parcial";
                    fixSuggestion = `Faltaram eventos (Encontrados: ${eventTypes.join(', ')}). Exige: message_received, product_detected, suggestion_created. Pode indicar CatalogService não achou o produto.`;
                }
            } else if (rootCause === "N/A") {
                rootCause = "ConversationService";
                fixSuggestion = "O Service falhou em criar uma Conversation para a Message.";
            }
        } else if (webhookOk && rootCause === "N/A") {
            rootCause = "Message Repository";
            fixSuggestion = "A mensagem não foi gravada no banco.";
        }

        const report = `Relatório técnico curto com:

Webhook ${webhookOk ? 'OK' : 'FAIL'}
Conversation criada ${conversationOk ? 'OK' : 'FAIL'}
Suggestion criada ${suggestionOk ? 'OK' : 'FAIL'}
Eventos operacionais ${operationalEventsOk ? 'OK' : 'FAIL'}
Possível causa raiz: ${webhookOk && conversationOk && suggestionOk && operationalEventsOk ? 'Nenhuma falha detectada' : rootCause}
Correção recomendada: ${webhookOk && conversationOk && suggestionOk && operationalEventsOk ? 'Tudo verde. Fluxo principal operacional.' : fixSuggestion}
`;

        console.log('\n--- RELATÓRIO TÉCNICO ---');
        console.log(report);
        
        await db.execute(sql`UPDATE tenants SET twilio_number = ${originalTwilio} WHERE id = ${tenantId}`);

        fs.writeFileSync('c:\\repos\\projeto-condstore\\qa_report.md', report);

    } catch (e) {
        console.error('FATAL ERROR:', e);
    }
    process.exit(0);
}

runTest();
