import type { Metadata } from 'next';
import {
    ArrowRight,
    CheckCircle2,
    ClipboardCheck,
    LineChart,
    Play,
    Users,
    Zap,
} from 'lucide-react';
import {
    PageContainer,
    PageSection,
    SectionIntro,
    HeroSection,
    FeatureGrid,
} from '@/ui/site';
import { TrackedLink } from '@/ui/lib/track-client';

export const metadata: Metadata = {
    title: 'Piloto Operacional — Condstore OS',
    description: 'Solicite uma avaliação operacional e inicie seu piloto assistido no Condstore OS.',
};

export default function PilotoPage() {
    return (
        <>
            <HeroSection
                eyebrow="Piloto Assistido"
                title={
                    <>
                        Valide o impacto na sua{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            operação real.
                        </span>
                    </>
                }
                subtitle="O piloto operacional é a forma mais segura de testar o Condstore OS com seus próprios dados, canais e equipe."
                ctas={[
                    { label: 'Solicitar avaliação agora', href: '/contato' },
                ]}
            />

            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                        <div>
                            <SectionIntro
                                eyebrow="Perfil"
                                title="Para quem é o piloto?"
                                description="Buscamos operações que lidam com volume diário de WhatsApp e complexidade logística."
                                align="left"
                            />
                            <ul className="mt-8 space-y-4">
                                {[
                                    'Empresas com atendimento comercial via WhatsApp.',
                                    'Operações que realizam múltiplas cotações de frete por dia.',
                                    'Times que sofrem com a falta de integração entre vendas e logística.',
                                    'Gestores que precisam de visibilidade em tempo real sobre a fila.',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                        <CheckCircle2 className="h-5 w-5 text-[hsl(var(--ui-success))] shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-8">
                            <h3 className="text-lg font-bold text-[hsl(var(--ui-text))] mb-6">Pré-requisitos básicos</h3>
                            <div className="space-y-6">
                                {[
                                    { icon: Users, label: 'Equipe Operacional', desc: 'Ter pelo menos um operador dedicado para validar o fluxo.' },
                                    { icon: Zap, label: 'Canal WhatsApp', desc: 'Uso de número comercial para integração via API.' },
                                    { icon: ClipboardCheck, label: 'Tabelas de Frete', desc: 'Disponibilidade das regras e tabelas de transportadoras.' },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="flex gap-4">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-[hsl(var(--ui-text))] mb-1">{item.label}</h4>
                                                <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="O Fluxo"
                        title="Como funciona o piloto"
                        description="Um processo estruturado em 4 etapas para garantir o sucesso da validação."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { step: '01', title: 'Setup e Carga', desc: 'Configuração do tenant e importação de dados iniciais.' },
                            { step: '02', title: 'Integração', desc: 'Conexão com canais de WhatsApp e ERP/Transportadoras.' },
                            { step: '03', title: 'Operação', desc: 'Uso real do sistema pelo time com apoio do Frank.' },
                            { step: '04', title: 'Avaliação', desc: 'Análise de métricas e decisão sobre escala.' },
                        ].map((item) => (
                            <div key={item.step} className="relative rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.2)] p-6">
                                <span className="text-4xl font-black text-[hsl(var(--ui-accent-blue)/0.1)] absolute top-4 right-6 leading-none select-none">
                                    {item.step}
                                </span>
                                <h3 className="text-base font-bold text-[hsl(var(--ui-text))] mb-2 relative z-10">{item.title}</h3>
                                <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed relative z-10">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </PageContainer>
            </PageSection>

            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Métricas"
                        title="O que vamos observar"
                        description="O sucesso do piloto é medido por ganhos reais de produtividade e visibilidade."
                    />
                    <FeatureGrid
                        columns={3}
                        items={[
                            {
                                icon: Zap,
                                title: 'Tempo de Resposta (SLA)',
                                description: 'Redução no tempo entre o contato inicial e a cotação de frete enviada.',
                            },
                            {
                                icon: LineChart,
                                title: 'Taxa de Conversão',
                                description: 'Impacto da agilidade na cotação sobre o fechamento de novos pedidos.',
                            },
                            {
                                icon: ClipboardCheck,
                                title: 'Rastro Operacional',
                                description: 'Volume de ações auditáveis e clareza de responsabilidade por pedido.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            <section className="border-t border-[hsl(var(--ui-border)/0.4)] py-16 md:py-24">
                <PageContainer narrow>
                    <div className="text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--ui-accent-blue))] text-white mb-8 shadow-xl shadow-[hsl(var(--ui-accent-blue)/0.2)]">
                            <Play className="h-8 w-8 fill-current" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] mb-6">
                            Pronto para começar?
                        </h2>
                        <p className="text-lg text-[hsl(var(--ui-text-muted))] mb-10 leading-relaxed">
                            Solicite sua avaliação operacional agora. Nossa equipe entrará em contato para validar os pré-requisitos e agendar o setup.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <TrackedLink
                                href="/contato"
                                trackPage="piloto"
                                trackSection="footer"
                                trackElement="request_evaluation"
                                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[hsl(var(--ui-accent-blue))] px-10 text-base font-bold text-white transition-all hover:bg-[hsl(var(--ui-accent-blue-strong))] shadow-lg shadow-[hsl(var(--ui-accent-blue)/0.2)] w-full sm:w-auto"
                            >
                                Solicitar avaliação operacional
                                <ArrowRight className="h-5 w-5" />
                            </TrackedLink>
                        </div>
                    </div>
                </PageContainer>
            </section>
        </>
    );
}
