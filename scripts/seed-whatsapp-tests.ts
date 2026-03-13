import 'dotenv/config';
import { getDb } from '../src/infra/db';
import { createPlaybook } from '../src/modules/frank/playbooks/playbook.repository';
import { createKnowledgeEntry } from '../src/modules/frank/knowledge/knowledge.repository';

// Default tenant for testing locally/staging
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'tenant-1';

async function seed() {
    console.log(`🌱 Seeding WhatsApp Test Data for Tenant: ${TEST_TENANT_ID}`);
    const db = await getDb();

    // 1. Playbook: Consulta de Preço
    const precoId = await createPlaybook({
        tenantId: TEST_TENANT_ID, title: 'Consulta de Preço Base', intent: 'PRICE_NEGOTIATION',
        responseBase: 'Posso consultar nossa tabela de preços para você.', nextStepSuggestion: 'Qual produto despertou seu interesse?',
        status: 'approved', priority: 10
    });
    console.log(`✅ Preço Playbook: ${precoId}`);

    // 2. Playbook: Consulta de Produto/Modelo
    const produtoId = await createPlaybook({
        tenantId: TEST_TENANT_ID, title: 'Consulta de Produto/Modelo', intent: 'PRODUTO',
        responseBase: 'Trabalhamos com diversos modelos de lixeiras e carrinhos.', nextStepSuggestion: 'Qual capacidade ou modelo específico você busca?',
        status: 'approved', priority: 10
    });
    console.log(`✅ Produto Playbook: ${produtoId}`);

    // 3. Playbook: Disponibilidade
    const dispId = await createPlaybook({
        tenantId: TEST_TENANT_ID, title: 'Consulta de Disponibilidade', intent: 'PRODUTO',
        responseBase: 'Vou checar a disponibilidade do item no nosso armazém.', nextStepSuggestion: 'Qual a cor desejada (ex: Verde, Azul)?',
        status: 'approved', priority: 5
    });
    console.log(`✅ Disponibilidade Playbook: ${dispId}`);

    // 4. Playbook: Consulta de Frete
    const freteId = await createPlaybook({
        tenantId: TEST_TENANT_ID, title: 'Consulta Geral de Frete', intent: 'FRETE',
        responseBase: 'Para calcular o frete exato preciso de algumas informações logísticas.', nextStepSuggestion: 'Poderia me informar o CEP e a quantidade desejada?',
        status: 'approved', priority: 10
    });
    console.log(`✅ Frete Playbook: ${freteId}`);

    // 5. Playbook: Pedido de CEP
    const cepId = await createPlaybook({
        tenantId: TEST_TENANT_ID, title: 'Pedido de CEP', intent: 'FRETE',
        responseBase: 'Ainda não possuo o seu CEP para concluir a cotação.', nextStepSuggestion: 'Qual é o CEP de destino?',
        status: 'approved', priority: 15
    });
    console.log(`✅ Pedido de CEP Playbook: ${cepId}`);

    // 6. Playbook: Dados Faltantes para Cotação
    const dadosFaltantesId = await createPlaybook({
        tenantId: TEST_TENANT_ID, title: 'Dados Faltantes (Cotação)', intent: 'CUSTOMER_CONTEXT',
        responseBase: 'Para gerarmos a simulação completa na transportadora, preciso confirmar seus dados.', nextStepSuggestion: 'Poderia me enviar seu CNPJ/CPF?',
        status: 'approved', priority: 10
    });
    console.log(`✅ Dados Faltantes Playbook: ${dadosFaltantesId}`);

    // 7. Playbook: Prazo de Entrega
    const prazoId = await createPlaybook({
        tenantId: TEST_TENANT_ID, title: 'Prazo de Entrega', intent: 'SHIPMENT_STATUS',
        responseBase: 'O prazo de entrega varia conforme a transportadora e a região.', nextStepSuggestion: 'Você já possui um pedido em andamento ou quer saber o prazo de uma nova compra?',
        status: 'approved', priority: 10
    });
    console.log(`✅ Prazo Playbook: ${prazoId}`);

    // 8. Playbook: Follow-up de Cotação
    const followUpId = await createPlaybook({
        tenantId: TEST_TENANT_ID, title: 'Follow-up de Cotação Enviada', intent: 'RECENT_QUOTES',
        responseBase: 'Vi que enviamos uma simulação de frete para você recentemente.', nextStepSuggestion: 'Ficou alguma dúvida sobre os valores? Podemos aprovar o pedido?',
        status: 'approved', priority: 10
    });
    console.log(`✅ Follow-up Cotação Playbook: ${followUpId}`);

    // Knowledge: Tabela Base
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
