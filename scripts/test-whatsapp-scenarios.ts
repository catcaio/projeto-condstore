import { supervisedAssistService } from '@/modules/frank/supervised-assist.service';

const scenarios = [
    'quanto custa carrinho 140 litros',
    'frete para cep 88034-000',
    'tem carrinho de 120?',
    'quero comprar 2 carrinhos',
];

async function run() {
    const tenantId = process.env.TEST_TENANT_ID ?? 'tenant-test';
    const conversationId = process.env.TEST_CONVERSATION_ID ?? 'conversation-test';
    const sessionId = process.env.TEST_SESSION_ID ?? 'session-test';

    for (const [index, message] of scenarios.entries()) {
        try {
            const result = await supervisedAssistService.generatePassiveSuggestion(
                tenantId,
                `${conversationId}-${index + 1}`,
                `${sessionId}-${index + 1}`,
                message,
            );

            console.log(JSON.stringify({
                scenario: index + 1,
                message,
                outcome: result.outcome,
                intent: result.intent,
                confidence: result.confidence,
                entities: result.entities,
                suggestedResponse: result.suggestedResponse,
            }));
        } catch (error: any) {
            console.error(JSON.stringify({
                scenario: index + 1,
                message,
                error: error?.message ?? 'unknown_error',
            }));
        }
    }
}

run().catch((error) => {
    console.error('test_whatsapp_scenarios_failed', error);
    process.exit(1);
});
