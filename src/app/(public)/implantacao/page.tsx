import {
    ClipboardCheck, Settings, Plug, Rocket, TrendingUp,
    MessageSquare, Building2, Truck, Globe, Database,
    FlaskConical, GraduationCap, Headphones, Workflow,
    Blocks, Brain, Shield, Users, BarChart3,
} from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection,
    FeatureGrid, FlowSection, CTASection,
} from '@/ui/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Implantação — Condstore OS',
    description: 'Saiba como o Condstore OS é implantado: diagnóstico operacional, configuração da plataforma, integrações, ativação e evolução contínua.',
};

export default function ImplantacaoPage() {
    return (
        <>
            {/* ─── 1. HERO ─── */}
            <HeroSection
                eyebrow="Implantação"
                title={
                    <>
                        Implantação estruturada para{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            operações reais.
                        </span>
                    </>
                }
                subtitle="Cada operação possui contexto, fluxo e necessidades diferentes. O Condstore OS é implantado de forma estruturada para funcionar desde o primeiro dia."
                ctas={[
                    { label: 'Falar sobre implantação', href: '/contato' },
                    { label: 'Explorar soluções', href: '/solucoes', variant: 'secondary' },
                ]}
            />

            {/* ─── 2. DIAGNÓSTICO OPERACIONAL ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                        <div>
                            <SectionIntro
                                eyebrow="Etapa 1"
                                title="Diagnóstico operacional."
                                description="Antes de ativar qualquer módulo, mapeamos como a operação funciona hoje — para que o sistema se adapte ao seu contexto, não o contrário."
                                align="left"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { icon: BarChart3, label: 'Fluxo comercial', desc: 'Como pedidos chegam, quem vende, quais canais alimentam a operação.' },
                                { icon: MessageSquare, label: 'Canais de entrada', desc: 'WhatsApp, portal, telefone, e-mail — cada canal tem seu peso.' },
                                { icon: Truck, label: 'Processo logístico', desc: 'Transportadoras, tabelas de frete, regras de despacho e exceções.' },
                                { icon: Users, label: 'Estrutura de clientes', desc: 'Perfil, segmentação, histórico e dados existentes de CRM.' },
                                { icon: Database, label: 'Dados existentes', desc: 'Planilhas, ERPs, sistemas internos — o que migra, o que conecta.' },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="rounded-xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-5">
                                        <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))] mb-3" />
                                        <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] mb-1 tracking-tight">{item.label}</h3>
                                        <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 3. CONFIGURAÇÃO DA PLATAFORMA ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Etapa 2"
                        title="Configuração da plataforma."
                        description="O sistema é configurado para refletir a realidade da sua operação — não uma configuração genérica."
                    />
                    <FlowSection
                        steps={[
                            {
                                number: '01',
                                title: 'Estrutura de tenants',
                                description: 'Ambientes isolados com dados, permissões e configurações independentes.',
                            },
                            {
                                number: '02',
                                title: 'Módulos ativados',
                                description: 'Apenas os módulos que a operação precisa agora. Novos módulos ativam quando fizer sentido.',
                            },
                            {
                                number: '03',
                                title: 'Regras operacionais',
                                description: 'Margem, prioridade de transportadora, SLA e fluxos de aprovação configurados por tenant.',
                            },
                            {
                                number: '04',
                                title: 'Integrações iniciais',
                                description: 'WhatsApp, transportadoras e sistemas internos conectados com validação ponto a ponto.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 4. INTEGRAÇÕES ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Etapa 3"
                        title="Integrações que conectam tudo."
                    />
                    <FeatureGrid
                        columns={3}
                        items={[
                            {
                                icon: MessageSquare,
                                title: 'WhatsApp',
                                description: 'Canal principal de atendimento integrado ao fluxo operacional. Cotação, pedido e tracking via conversa.',
                            },
                            {
                                icon: Building2,
                                title: 'ERP',
                                description: 'Sincronização com o sistema de gestão existente. Pedidos, NFs e cadastros mantidos em sincronia.',
                            },
                            {
                                icon: Settings,
                                title: 'Sistemas internos',
                                description: 'APIs, bancos de dados e fluxos customizados conectados via webhooks e event bus.',
                            },
                            {
                                icon: Truck,
                                title: 'Transportadoras',
                                description: 'APIs de cotação, tracking e despacho. Tabelas próprias normalizadas com fallback automático.',
                            },
                            {
                                icon: Globe,
                                title: 'APIs externas',
                                description: 'Marketplaces, plataformas de e-commerce e qualquer serviço REST ou webhook.',
                            },
                            {
                                icon: Plug,
                                title: 'Event bus',
                                description: 'Cada integração gera eventos auditáveis. Retry, DLQ e observabilidade nativos.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 5. ATIVAÇÃO DA OPERAÇÃO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Etapa 4"
                        title="Ativação com acompanhamento."
                        description="A operação não é ligada sem validação. Cada fluxo é testado antes de ir ao vivo."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            { icon: FlaskConical, title: 'Testes', desc: 'Fluxos completos validados em ambiente de staging com dados reais simulados.' },
                            { icon: ClipboardCheck, title: 'Validação de fluxo', desc: 'Cada etapa — do pedido à entrega — verificada com operadores reais.' },
                            { icon: GraduationCap, title: 'Treinamento', desc: 'Time treinado nos módulos ativos com foco em casos reais da operação.' },
                            { icon: Headphones, title: 'Acompanhamento', desc: 'Suporte dedicado nos primeiros dias de operação ao vivo.' },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.title} className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 text-center">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] mx-auto mb-4">
                                        <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />
                                    </div>
                                    <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">{item.title}</h3>
                                    <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 6. EVOLUÇÃO CONTÍNUA ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Após a ativação"
                        title="O sistema evolui junto com a operação."
                        description="Implantação não é o fim — é o começo. A plataforma cresce continuamente com a sua operação."
                    />
                    <FeatureGrid
                        columns={4}
                        items={[
                            {
                                icon: Workflow,
                                title: 'Automações',
                                description: 'Regras configuráveis que executam ações baseadas em eventos do sistema.',
                            },
                            {
                                icon: Blocks,
                                title: 'Novos módulos',
                                description: 'Ativados quando a operação precisar, sem reescrever o que já funciona.',
                            },
                            {
                                icon: Brain,
                                title: 'Inteligência',
                                description: 'Frank Supremo evolui com novos modelos, análises e interações.',
                            },
                            {
                                icon: Shield,
                                title: 'Governança',
                                description: 'Permissões, auditoria e configurações refinadas continuamente.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 7. CTA FINAL ─── */}
            <CTASection
                title="Entenda como implantar o Condstore OS na sua operação."
                subtitle="Cada operação é diferente. Vamos entender a sua."
                ctas={[
                    { label: 'Solicitar demonstração', href: '/contato' },
                    { label: 'Explorar soluções', href: '/solucoes', variant: 'secondary' },
                ]}
            />
        </>
    );
}
