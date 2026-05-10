import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import crypto from 'crypto';
import fetch from 'node-fetch';

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const WEBHOOK_URL = 'https://app.condstoreos.com/api/whatsapp/incoming'; 

if (!TWILIO_AUTH_TOKEN) {
    console.error("TWILIO_AUTH_TOKEN not found in environment.");
    process.exit(1);
}

const payload = {
    SmsMessageSid: 'SM' + crypto.randomBytes(16).toString('hex'),
    NumMedia: '0',
    ProfileName: 'Frank Tester',
    SmsSid: 'SM' + crypto.randomBytes(16).toString('hex'),
    WaId: '5511999999999',
    SmsStatus: 'received',
    Body: 'Teste de integracao local com signature!',
    To: 'whatsapp:+14155238886', 
    NumSegments: '1',
    MessageSid: 'SM' + crypto.randomBytes(16).toString('hex'),
    AccountSid: 'AC' + crypto.randomBytes(16).toString('hex'),
    From: 'whatsapp:+5511999999999',
    ApiVersion: '2010-04-01'
};

const url = process.env.TWILIO_WEBHOOK_BASE_URL 
    ? `${process.env.TWILIO_WEBHOOK_BASE_URL.replace(/\/$/, '')}/api/whatsapp/incoming`
    : WEBHOOK_URL;

const params = new URLSearchParams(payload);
const data = Object.fromEntries(params.entries());

const sortedKeys = Object.keys(data).sort();
let stringToSign = url;
for (const key of sortedKeys) {
    stringToSign += key + data[key];
}

const signature = crypto
    .createHmac('sha1', TWILIO_AUTH_TOKEN)
    .update(stringToSign)
    .digest('base64');

console.log('--- ENVIANDO WEBHOOK PARA LOCALHOST ---');
console.log('URL Base validada:', url);
console.log('Signature enviada:', signature);

async function run() {
    try {
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'x-twilio-signature': signature,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Host': 'app.condstoreos.com'
            },
            body: new URLSearchParams(payload).toString()
        });
        console.log('--- RESPOSTA ---');
        console.log('Status HTTP:', res.status);
        if (res.status === 500) {
            console.error("Erro no Webhook. Cheque os logs do servidor Next.js!");
        }
        console.log('Body HTML/TwiML:', await res.text());
    } catch (e) {
        console.error('Falha de rede:', e);
    }
}

run();
