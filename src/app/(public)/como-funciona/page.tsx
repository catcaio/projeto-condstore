import {
    PageContainer, PageSection, SectionIntro, FlowSection, CTASection,
} from '@/ui/site';

export const metadata = {
    title: 'Como funciona — Condstore OS',
    description: 'Entenda o fluxo operacional do Condstore OS: do pedido ao pós-venda, cada etapa com visibilidade total e ação imediata.',
};

export default function ComoFuncionaPage() {
    return (
        <>
            <PageSection spacing="xl">
                <PageContainer>
                    <SectionIntro
                        eyebrow="Como funciona"
                        title="Do pedido à entrega, sem ponto cego."
                        description="O Condstore OS conecta cada etapa da sua operação logística em um fluxo contínuo. Sem saltos entre ferramentas, sem informação perdida."
                    />
                </PageContainer>
            </PageSection>

            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Fluxo completo"
                        title="Quatro passos. Um sistema."
                    />
                    <FlowSection
                        steps={[
                            {
                                number: '01',
                                title: 'Captura inteligente',
                                description: 'Pedidos entram por WhatsApp, portal ou API. O sistema identifica o cliente, valida os dados e roteia para a fila certa automaticamente.',
                            },
                            {
                                number: '02',
                                title: 'Cotação multi-transportadora',
                                description: 'Tabelas de frete normalizadas, APIs diretas de transportadoras e motor de regras. A melhor opção aparece em milissegundos.',
                            },
                            {
                                number: '03',
                                title: 'Execução monitorada',
                                description: 'Etiqueta gerada, coleta agendada, tracking ativo. Se algo sair do trilho, o sistema escala ao operador com contexto completo.',
                            },
                            {
                                number: '04',
                                title: 'Ciclo fechado',
                                description: 'Cliente atualizado automaticamente. Métricas registradas. SLA auditado. Dashboard alimentado. Sem ação manual.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Engenharia"
                        title="Infraestrutura construída para operações reais."
                    />
                    <FlowSection
                        steps={[
                            {
                                number: '→',
                                title: 'Event-driven',
                                description: 'Cada ação gera um evento auditável. Processamento assíncrono com retry, DLQ e observabilidade completa.',
                            },
                            {
                                number: '→',
                                title: 'Multi-tenant',
                                description: 'Isolamento por tenant. Cada operação tem dados, configurações e permissões separadas nativamente.',
                            },
                            {
                                number: '→',
                                title: 'Zero-Trust',
                                description: 'Autenticação forte, RBAC, audit trail e detecção de anomalias. Segurança não é feature — é infraestrutura.',
                            },
                            {
                                number: '→',
                                title: 'IA governada',
                                description: 'Frank Supremo opera sob budget de tokens, permissões por tenant e auditoria completa. Inteligência com guardrail.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            <CTASection
                title="Pronto para operar o MVP supervisionado na prática?"
                subtitle="Siga o mesmo caminho principal do site oficial para iniciar sua operação."
                ctas={[
                    { label: 'Iniciar operação no MVP', href: '/signup' },
                ]}
            />
        </>
    );
}
