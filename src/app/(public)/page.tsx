import {
    Truck, Bot, MessageSquare, Shield, Zap,
    Package, Users, Clock, TrendingUp, Workflow, LayoutDashboard,
    Inbox, ScanSearch, FileCheck, MapPin,
    Gauge, Smartphone,
} from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection,
    FeatureGrid, CTASection, ModuleGrid, ComparisonBand, OperationFlow,
    TrustBand, FaqSection, ScrollReveal, OperationProof,
} from '@/ui/site';

export const metadata = {
    title: 'Condstore OS — Infraestrutura operacional premium para logística B2B',
    description: 'O sistema operacional que unifica frete, vendas, atendimento e inteligência artificial em uma única plataforma. Elimine planilhas, integrações frágeis e operação manual.',
};

export const revalidate = 86400;

export default function HomePage() {
    return (
        <>
            {/* ━━━ 1. HERO ━━━ */}
            <HeroSection
                eyebrow="Infraestrutura operacional premium"
                title={
                    <>
                        O sistema operacional{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            que a sua logística merece.
                        </span>
                    </>
                }
                subtitle="Frete, vendas, atendimento e IA em uma única plataforma — construída para operações reais no Brasil."
                ctas={[
                    { label: 'Começar agora', href: '/signup' },
                    { label: 'Como funciona', href: '/como-funciona', variant: 'secondary' },
                ]}
            />

            {/* ━━━ 2. TRUST BAND ━━━ */}
            <TrustBand />

            {/* ━━━ 3. DOR OPERACIONAL ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="O problema"
                            title="A operação logística brasileira ainda opera no escuro."
                        />
                        <FeatureGrid
                            columns={4}
                            items={[
                                {
                                    icon: Clock,
                                    title: 'Cotação lenta',
                                    description: 'Telefonema, espera, digitação manual. 15 minutos por cotação.',
                                },
                                {
                                    icon: Package,
                                    title: 'Pedidos invisíveis',
                                    description: 'WhatsApp → ERP → NF. Ninguém sabe o status real.',
                                },
                                {
                                    icon: MessageSquare,
                                    title: 'Atendimento cego',
                                    description: 'Operador responde sem saber se a entrega atrasou.',
                                },
                                {
                                    icon: TrendingUp,
                                    title: 'Margem invisível',
                                    description: 'Sem visibilidade de custo por envio, a margem desaparece.',
                                },
                            ]}
                        />
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 4. A VIRADA ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="A virada"
                            title="Do caos para controle total."
                        />
                        <ComparisonBand
                            left={{
                                label: 'Antes',
                                tone: 'negative',
                                items: [
                                    'Cotação manual por telefone',
                                    'Pedido sem estado definido',
                                    'Atendimento desconectado da logística',
                                    'Margem calculada uma vez por mês',
                                    'Cada ferramenta é um silo',
                                ],
                            }}
                            right={{
                                label: 'Com o Condstore OS',
                                tone: 'positive',
                                items: [
                                    'Cotação multi-transportadora automática',
                                    'Pedido rastreado do checkout à entrega',
                                    'Atendente vê contexto completo',
                                    'Margem visível por transportadora e região',
                                    'Uma plataforma, um fluxo operacional',
                                ],
                            }}
                        />
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 5. FLUXO SUPERVISIONADO ━━━ */}
            <ScrollReveal>
                <PageSection spacing="xl" borderTop id="operacao">
                    <PageContainer>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
                            {/* Left: editorial intro */}
                            <div className="lg:sticky lg:top-32">
                                <SectionIntro
                                    eyebrow="Fluxo supervisionado"
                                    title="Do WhatsApp ao cockpit com gate humano no meio do caminho."
                                    description="Cada etapa alimenta a próxima, mas aprovação explícita bloqueia avanço indevido. O contexto nunca se perde."
                                    align="left"
                                />
                                <div className="mt-8 flex items-center gap-4">
                                    <div className="flex -space-x-1.5">
                                        {['bg-[hsl(var(--ui-accent-blue))]', 'bg-[hsl(var(--ui-success))]', 'bg-[hsl(var(--ui-accent-blue-strong))]'].map((bg, i) => (
                                            <div key={i} className={`h-8 w-8 rounded-full border-2 border-[hsl(var(--ui-page))] ${bg} flex items-center justify-center`}>
                                                <span className="text-[9px] font-bold text-white">{['C', 'P', 'L'][i]}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-xs text-[hsl(var(--ui-text-subtle))] font-medium">
                                        Conversas → Pedidos → Logística
                                    </span>
                                </div>
                            </div>

                            {/* Right: the pipeline */}
                            <div className="relative">
                                <div className="absolute -top-8 -bottom-8 -left-4 -right-4 rounded-3xl border border-[hsl(var(--ui-border)/0.2)] bg-[hsl(var(--ui-surface)/0.15)]" />
                                <div className="relative z-10 p-2 md:p-4">
                                    <OperationFlow
                                        steps={[
                                            {
                                                icon: Inbox,
                                                label: 'Nova mensagem recebida',
                                                detail: 'WhatsApp, portal ou API. O sistema captura e notifica em tempo real.',
                                            },
                                            {
                                                icon: Users,
                                                label: 'Cliente identificado',
                                                detail: 'Perfil, histórico de pedidos e conversas anteriores carregados automaticamente.',
                                                accent: 'var(--ui-success)',
                                            },
                                            {
                                                icon: ScanSearch,
                                                label: 'Intenção assistida',
                                                detail: 'A camada inteligente apoia o operador e sugere se a demanda é cotação, pedido, tracking ou suporte.',
                                            },
                                            {
                                                icon: Zap,
                                                label: 'Simulação criada',
                                                detail: 'Cotação multi-transportadora gerada em milissegundos com margem calculada.',
                                            },
                                            {
                                                icon: FileCheck,
                                                label: 'Aprovação exigida',
                                                detail: 'Sem aceite explícito do cliente e revisão do operador, o fluxo não avança para pedido nem logística.',
                                                accent: 'var(--ui-accent-blue)',
                                            },
                                            {
                                                icon: Package,
                                                label: 'Pedido formalizado',
                                                detail: 'Pedido registrado com estado, responsável e timeline de eventos depois do gate de aprovação.',
                                                accent: 'var(--ui-success)',
                                            },
                                            {
                                                icon: MapPin,
                                                label: 'Logística em andamento',
                                                detail: 'Etiqueta gerada, coleta agendada, tracking ativo. Exceções detectadas.',
                                            },
                                            {
                                                icon: Gauge,
                                                label: 'Cockpit atualizado',
                                                detail: 'Métricas, SLA e dashboards alimentados automaticamente. Ciclo fechado.',
                                            },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 6. PROVA OPERACIONAL ━━━ */}
            <ScrollReveal>
                <OperationProof variant="compact" />
            </ScrollReveal>

            {/* ━━━ 7. MÓDULOS ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Ecossistema"
                            title="Módulos que trabalham juntos."
                        />
                        <ModuleGrid
                            modules={[
                                {
                                    icon: Truck,
                                    name: 'Condstore Envios',
                                    tagline: 'Gateway de frete',
                                    description: 'Cotação, despacho e tracking multi-transportadora com tabelas próprias.',
                                    accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                                },
                                {
                                    icon: Users,
                                    name: 'Condstore CRM',
                                    tagline: 'Vendas B2B',
                                    description: 'Visão 360 do cliente conectada a pedidos, conversas e simulações.',
                                    accentClass: 'text-[hsl(var(--ui-success))]',
                                },
                                {
                                    icon: Workflow,
                                    name: 'DOMINE',
                                    tagline: 'Motor de eventos',
                                    description: 'Processamento assíncrono com DLQ, retry e auditoria completa.',
                                    accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                                },
                                {
                                    icon: LayoutDashboard,
                                    name: 'Cockpit OS',
                                    tagline: 'Centro de comando',
                                    description: 'Métricas, alertas, filas de ação e diagnóstico em tempo real.',
                                    accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                                },
                                {
                                    icon: Bot,
                                    name: 'Frank Supremo',
                                    tagline: 'IA operacional',
                                    description: 'Análise de padrões, sugestões de ação e apoio ao atendimento via WhatsApp com supervisão humana.',
                                    accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                                },
                                {
                                    icon: Shield,
                                    name: 'Zero-Trust',
                                    tagline: 'Segurança nativa',
                                    description: 'Multi-tenant, RBAC, audit trail e detecção de anomalias.',
                                    accentClass: 'text-[hsl(var(--ui-danger))]',
                                },
                                {
                                    icon: Smartphone,
                                    name: 'App do Ecossistema',
                                    tagline: 'Acesso distribuído',
                                    description: 'Cada perfil acessa o que precisa: gestor, operador, cliente, entregador.',
                                    accentClass: 'text-[hsl(var(--ui-success))]',
                                },
                            ]}
                        />
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 8. FAQ ━━━ */}
            <ScrollReveal>
                <FaqSection />
            </ScrollReveal>

            {/* ━━━ 9. CTA FINAL ━━━ */}
            <CTASection
                title="Pronto para profissionalizar sua operação?"
                subtitle="Infraestrutura de verdade para logística de verdade."
                ctas={[
                    { label: 'Começar agora', href: '/signup' },
                    { label: 'Falar com o time', href: '/about', variant: 'secondary' },
                ]}
            />
        </>
    );
}
