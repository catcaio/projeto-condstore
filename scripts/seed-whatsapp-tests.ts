import 'dotenv/config';
import { getDb } from '../src/infra/db';
import { createPlaybook } from '../src/modules/frank/playbooks/playbook.repository';
import { createKnowledgeEntry } from '../src/modules/frank/knowledge/knowledge.repository';

// Default tenant for testing locally/staging
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'tenant-1';

async function seed() {
    console.log(`🌱 Seeding WhatsApp Test Data for Tenant: ${TEST_TENANT_ID}`);
    const db = await getDb();

    // 1. Playbook: Consulta de Frete
    const fretePlaybookId = await createPlaybook({
        tenantId: TEST_TENANT_ID,
        title: 'Consulta de Valor de Frete',
        intent: 'FRETE',
        responseBase: 'Para calcular o frete preciso de algumas informações.',
        nextStepSuggestion: 'Qual é o seu CEP e a quantidade de lixeiras que deseja?',
        status: 'approved',
        priority: 10
    });
    console.log(`✅ Frete Playbook Created: ${fretePlaybookId}`);

    // 2. Playbook: Consulta de Produto
    const produtoPlaybookId = await createPlaybook({
        tenantId: TEST_TENANT_ID,
        title: 'Disponibilidade de Produto',
        intent: 'PRODUTO',
        responseBase: 'Temos vários modelos de lixeiras e carrinhos disponíveis em nosso catálogo.',
        nextStepSuggestion: 'Você busca por qual capacidade em litros? Ex: 240L, 1000L.',
        status: 'approved',
        priority: 10
    });
    console.log(`✅ Produto Playbook Created: ${produtoPlaybookId}`);

    // 3. Knowledge: Tabela Base
    const knowledgeId = await createKnowledgeEntry({
        tenantId: TEST_TENANT_ID,
        title: 'Tabela de Preços Base - Lixeiras Clássicas',
        content: `
Preços Base (sujeitos a frete):
- Lixeira 240L Plástica com pedal: R$ 350,00
- Lixeira 120L Plástica com pedal: R$ 180,00
- Container 1000L Plástico: R$ 1.850,00
- Carrinho de Supermercado 90L: R$ 420,00

Cores disponíveis: Verde, Azul, Vermelho, Amarelo, Marrom, Cinza, Laranja, Preto e Branco.
Prazo médio de expedição: 2 a 3 dias úteis após confirmação do frete.
        `.trim(),
        tags: ['preços', 'produtos'],
        source: 'manual'
    });
    console.log(`✅ Knowledge Base Created: ${knowledgeId}`);

    console.log('🚀 Seeding completed successfully!');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
