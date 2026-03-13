import 'dotenv/config';
import { getDb } from '../src/infra/db';
import { frankPlaybooks } from '../src/drizzle/schema';
import { randomUUID } from 'crypto';

async function main() {
    const db = await getDb();
    const defaultTenantId = process.env.SYSTEM_TENANT_ID || 'tenant-seed-001';

    console.log(`\n🌱 [Seed] Abastecendo base editorial do Frank para Tenant: ${defaultTenantId}`);

    const newPlaybooks = [
        {
            title: 'Consulta de Preços - Tabela Padrão',
            intent: 'consulta_preco',
            triggerPhrases: ['qual o valor', 'como funciona o preço', 'tabela de preços', 'quanto custa'],
            relatedEntities: ['product', 'sku', 'price'],
            responseBase: 'O valor do produto X é de Y, com pedido mínimo de Z unidades. Gostaria de uma proposta formal?',
            responseShort: 'Tabela Padrão: R$ X,00 (mínimo de Z und).',
            nextStepSuggestion: 'Gerar Cotação Comercial',
            requiresConfirmation: false,
            requiresHumanHandoff: false,
            handoffConditions: '',
            tags: ['comercial', 'pricing'],
            status: 'approved',
            priority: 10
        },
        {
            title: 'Consulta de Frete (Simulação)',
            intent: 'FRETE',
            triggerPhrases: ['qual o frete', 'entregam no meu cep', 'quanto é a entrega', 'qual transportadora'],
            relatedEntities: ['volume', 'product', 'quantity', 'cep'],
            responseBase: 'Entregamos em todo o Brasil. Para gerar uma cotação exata de frete, preciso saber: (1) O CEP de destino, (2) Qual produto deseja e (3) A quantidade aproximada. Pode me confirmar esses dados?',
            responseShort: 'Solicitando CEP, Produto e Quantidade para frete.',
            nextStepSuggestion: 'Aguardar Dados do Cliente',
            requiresConfirmation: false,
            requiresHumanHandoff: false,
            handoffConditions: '',
            tags: ['logistica', 'cotacao'],
            status: 'approved',
            priority: 20
        },
        {
            title: 'Rastreio de Pedido Logístico',
            intent: 'rastreio_pedido',
            triggerPhrases: ['onde está meu pedido', 'rastreio', 'código de envio', 'cadê minha compra'],
            relatedEntities: ['orderId', 'trackingCode'],
            responseBase: 'Vou localizar seu pedido. Por favor, confirme o número do pedido ou aguarde um instante enquanto busco no seu cadastro.',
            responseShort: 'Buscando localização...',
            nextStepSuggestion: 'Acionar Tracking Service',
            requiresConfirmation: false,
            requiresHumanHandoff: true,
            handoffConditions: 'Tracking não encontrado ou status FAILED/Exception',
            tags: ['logistica', 'pos_venda'],
            status: 'approved',
            priority: 30
        },
        {
            title: 'Segunda Via de Boleto/NF',
            intent: 'segunda_via',
            triggerPhrases: ['segunda via', 'boleto', 'nota fiscal', 'nf-e', 'xml', 'fatura'],
            relatedEntities: ['invoiceNumber', 'dueDate'],
            responseBase: 'Para questões financeiras, vou transferir você agora mesmo para um especialista que te enviará o arquivo correto sem burocracia.',
            responseShort: 'Transferindo para o financeiro...',
            nextStepSuggestion: 'Transferir para Fila Financeira',
            requiresConfirmation: true,
            requiresHumanHandoff: true,
            handoffConditions: 'Sempre transfere a um humano financeiro',
            tags: ['financeiro', 'human-handoff'],
            status: 'approved',
            priority: 40
        }
    ];

    let inserted = 0;

    for (const pb of newPlaybooks) {
        try {
            await db.insert(frankPlaybooks).values({
                id: randomUUID(),
                tenantId: defaultTenantId,
                title: pb.title,
                intent: pb.intent,
                triggerPhrases: pb.triggerPhrases,
                relatedEntities: pb.relatedEntities,
                responseBase: pb.responseBase,
                responseShort: pb.responseShort,
                nextStepSuggestion: pb.nextStepSuggestion,
                requiresConfirmation: pb.requiresConfirmation,
                requiresHumanHandoff: pb.requiresHumanHandoff,
                handoffConditions: pb.handoffConditions,
                tags: pb.tags,
                status: pb.status,
                priority: pb.priority
            });
            console.log(`✅ Playbook Inserido: ${pb.title} [${pb.intent}]`);
            inserted++;
        } catch (e: any) {
            console.error(`❌ Erro ao inserir Playbook ${pb.title}:`, e.message);
        }
    }

    console.log(`\n🎉 [Seed Finalizado] Foram abastecidos ${inserted} playbooks base.`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
