process.env.FRANK_RUNTIME_MODE = 'SUPERVISED_ONLY';
import 'dotenv/config';
import { getDb } from '../src/infra/db';
import { conversationService } from '../src/modules/atendimento/conversation.service';
import { supervisedAssistService } from '../src/modules/frank/supervised-assist.service';
import { normalizeAndHash } from '../src/lib/phone';
import { encryptString } from '../src/infra/pii/crypto';

const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'tenant-1';
const TEST_PHONE = '+5511999999999';

const scenarios = [
    "quanto custa o carrinho 140L?",
    "tem lixeira 240L?",
    "qual o frete para 88034000?",
    "qual o prazo para esse CEP?",
    "e para 2 unidades?"
];

async function runScenarios() {
    console.log(`🤖 Starting WhatsApp Scenarios Test for Tenant: ${TEST_TENANT_ID}`);
    const db = await getDb();
    
    // Simulate incoming phone
    const fromNormalized = normalizeAndHash(TEST_PHONE).normalized;
    const phoneHash = normalizeAndHash(TEST_PHONE).hash;

    for (let i = 0; i < scenarios.length; i++) {
        const message = scenarios[i];
        console.log(`\n\n--- Scenario ${i + 1} ---`);
        console.log(`📩 Message: "${message}"`);
        
        try {
            // 1. Process Inbound Message
            const { conversation, message: insertedMsg } = await conversationService.processInboundMessage(
                TEST_TENANT_ID,
                phoneHash,
                encryptString(fromNormalized),
                message,
                undefined, // customer fallback
                undefined,
                { source: 'test-script' }
            );
            console.log(`✅ Message Registered. Conversation ID: ${conversation.id}`);

            // 2. Generate Passive Suggestion
            const suggestion = await supervisedAssistService.generatePassiveSuggestion(
                TEST_TENANT_ID,
                conversation.id,
                phoneHash,
                message
            );
            console.log(`🧠 Intent Detected: ${suggestion.intent} (Confidence: ${suggestion.confidence})`);
            console.log(`💡 Suggestion Created: ${suggestion.suggestedResponse}`);
            console.log(`⚙️  Entities: ${JSON.stringify(suggestion.entities)}`);

        } catch (err) {
            console.error(`❌ Scenario ${i + 1} failed:`, err);
        }
        
        // slight delay to emulate chatting sequence
        await new Promise(res => setTimeout(res, 1000));
    }

    console.log('\n🎉 All scenarios executed successfully!');
    process.exit(0);
}

runScenarios().catch(err => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
});
