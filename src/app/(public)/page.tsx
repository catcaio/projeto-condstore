import {
    AlertTriangle,
    BarChart3,
    ClipboardCheck,
    Clock3,
    Gauge,
    Hand,
    Route,
    Shield,
    Timer,
    Wallet,
} from 'lucide-react';
import {
    CTASection,
    FeatureGrid,
    HeroSection,
    MvpCoreFlowSection,
    PageContainer,
    PageSection,
    ScrollReveal,
    SectionIntro,
} from '@/ui/site';

export const metadata = {
    title: 'Condstore OS — Site oficial do MVP operacional',
    description: 'Operação supervisionada via WhatsApp, aprovação antes do pedido, rastreabilidade ponta a ponta e cockpit vivo para execução logística diária.',
};

export const revalidate = 86400;

export default function HomePage() {
    return (
        <>
            <HeroSection
                eyebrow="CONDSTORE OS | MVP SUPERVISIONADO"
                title={
                    <>
                        Infraestrutura operacional para rodar
                        {' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            WhatsApp, frete e pedidos com controle real.
                        </span>
                    </>
                }
                subtitle="Nada de fluxo autônomo fora de governança: toda conversa é supervisionada, toda proposta pode ser revisada e todo pedido exige aprovação antes de seguir para expedição."
                ctas={[{ label: 'Iniciar operação no MVP', href: '/signup' }]}
            />

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {[
                                {
                                    icon: Hand,
                                    title: 'Fluxo supervisionado por padrão',
                                    desc: 'Operador humano preservado no centro da decisão, com contexto completo por conversa.',
                                },
                                {
                                    icon: ClipboardCheck,
                                    title: 'Aprovação antes do pedido',
                                    desc: 'Cotação e condições passam por validação operacional antes de virar ordem executável.',
                                },
                                {
                                    icon: Route,
                                    title: 'Rastreabilidade ponta a ponta',
                                    desc: 'Timeline única da mensagem inicial até coleta, trânsito e entrega.',
                                },
                            ].map((pillar) => {
                                const Icon = pillar.icon;
                                return (
                                    <article
                                        key={pillar.title}
                                        className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.45)] p-5"
                                    >
                                        <div className="mb-3 flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--ui-accent-blue)/0.15)]">
                                                <Icon className="h-4 w-4 text-[hsl(var(--ui-accent-blue))]" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-[hsl(var(--ui-text))]">{pillar.title}</h3>
                                        </div>
                                        <p className="text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{pillar.desc}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Problema operacional"
                            title="Sem rotina operacional única, o time perde prazo, margem e confiança do cliente."
                        />
                        <FeatureGrid
                            columns={4}
                            items={[
                                {
                                    icon: Clock3,
                                    title: 'Resposta atrasada no WhatsApp',
                                    description: 'A conversa avança sem contexto de frete, estoque ou status de entrega.',
                                },
                                {
                                    icon: AlertTriangle,
                                    title: 'Pedido sem checkpoint',
                                    description: 'Condição comercial vira pedido sem validação final de operação.',
                                },
                                {
                                    icon: Timer,
                                    title: 'SLA só aparece no problema',
                                    description: 'A equipe descobre exceção tarde, quando o cliente já cobrou retorno.',
                                },
                                {
                                    icon: Wallet,
                                    title: 'Margem oscila sem diagnóstico',
                                    description: 'Decisão de transportadora ocorre sem leitura consolidada de custo real.',
                                },
                            ]}
                        />
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="xl" borderTop id="operacao">
                    <PageContainer>
                        <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-2 lg:gap-20">
                            <div className="lg:sticky lg:top-32">
                                <SectionIntro
                                    eyebrow="Fluxo real do MVP"
                                    title="O fluxo operacional é único: conversa, aprovação, pedido, shipment e cockpit."
                                    description="Cada etapa registra estado, responsável e horário. Sem salto manual e sem perda de contexto entre atendimento, logística e gestão."
                                    align="left"
                                />
                                <div className="mt-8 rounded-2xl border border-[hsl(var(--ui-success)/0.35)] bg-[hsl(var(--ui-success)/0.09)] p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ui-success))]">Gate obrigatório</p>
                                    <p className="mt-2 text-sm text-[hsl(var(--ui-text))]">
                                        Nenhum pedido segue sem aprovação operacional registrada no fluxo.
                                    </p>
                                </div>
                            </div>
                            <MvpCoreFlowSection />
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Controle e governança"
                            title="Robustez operacional comprovável: status, aprovação, auditoria e handoff humano."
                        />
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {[
                                {
                                    icon: Gauge,
                                    title: 'Status vivo por pedido',
                                    desc: 'Painel operacional mostra fila, em execução, risco e concluído com atualização contínua.',
                                },
                                {
                                    icon: ClipboardCheck,
                                    title: 'Aprovação com responsável',
                                    desc: 'Cada aceite fica associado a usuário, horário e contexto comercial da conversa.',
                                },
                                {
                                    icon: Route,
                                    title: 'Timeline auditável',
                                    desc: 'Rastro de eventos conecta atendimento, pedido e shipment no mesmo registro.',
                                },
                                {
                                    icon: Shield,
                                    title: 'Governança nativa',
                                    desc: 'Isolamento multi-tenant, RBAC e trilha de auditoria como padrão de execução.',
                                },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article
                                        key={item.title}
                                        className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.35)] p-6"
                                    >
                                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.12)]">
                                            <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />
                                        </div>
                                        <h3 className="text-base font-semibold text-[hsl(var(--ui-text))]">{item.title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{item.desc}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Cockpit e métricas reais"
                            title="O MVP mede execução diária, não promessa de marketing."
                        />
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <article className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.35)] p-6 lg:col-span-2">
                                <h3 className="text-base font-semibold text-[hsl(var(--ui-text))]">Indicadores operacionais acompanhados no cockpit</h3>
                                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {[
                                        { icon: BarChart3, label: 'Tempo de resposta por fila', value: 'Com corte por operador e turno' },
                                        { icon: Gauge, label: 'SLA prometido vs. realizado', value: 'Acompanhamento por rota e transportadora' },
                                        { icon: ClipboardCheck, label: 'Taxa de aprovação antes do pedido', value: 'Visível por canal e responsável' },
                                        { icon: Route, label: 'Entrega com rastreabilidade completa', value: 'Mensagem inicial até comprovante de entrega' },
                                    ].map((metric) => {
                                        const Icon = metric.icon;
                                        return (
                                            <div key={metric.label} className="rounded-xl border border-[hsl(var(--ui-border)/0.35)] bg-[hsl(var(--ui-page)/0.45)] p-4">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ui-text))]">
                                                    <Icon className="h-4 w-4 text-[hsl(var(--ui-accent-blue))]" />
                                                    {metric.label}
                                                </div>
                                                <p className="mt-2 text-xs text-[hsl(var(--ui-text-muted))]">{metric.value}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </article>
                            <article className="rounded-2xl border border-[hsl(var(--ui-success)/0.35)] bg-[hsl(var(--ui-success)/0.08)] p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ui-success))]">Handoff humano preservado</p>
                                <h3 className="mt-2 text-base font-semibold text-[hsl(var(--ui-text))]">Automação assistida, decisão responsável.</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                    O MVP acelera a execução com dados e sugestões, sem retirar do operador o poder de revisar, aprovar e assumir casos críticos.
                                </p>
                            </article>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <CTASection
                title="Leve sua operação para um fluxo supervisionado e rastreável."
                subtitle="Um único caminho de ativação para o MVP oficial do CONDSTORE OS."
                ctas={[{ label: 'Iniciar operação no MVP', href: '/signup' }]}
            />
        </>
    );
}
