import {
    MessageSquare, Users, ScanSearch, Brain,
    Package, Zap, FileCheck, CheckCircle2,
    Truck, MapPin, AlertTriangle, RefreshCw,
    LayoutDashboard, BarChart3, Clock, Eye,
    TrendingUp, Gauge,
} from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection,
    FeatureGrid, CTASection, OperationFlow,
} from '@/ui/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Casos — Condstore OS',
    description: 'Veja como o Condstore OS funciona na prática: atendimento contextual, simulação de frete, logística rastreada e cockpit operacional.',
};

export default function CasosPage() {
    return (
        <>
            {/* ─── 1. HERO ─── */}
            <HeroSection
                eyebrow="Na prática"
                title={
                    <>
                        Como o Condstore OS funciona{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            na prática.
                        </span>
                    </>
                }
                subtitle="Veja como operações utilizam a plataforma para organizar atendimento, pedidos e logística."
                ctas={[
                    { label: 'Explorar a plataforma', href: '/plataforma' },
                    { label: 'Solicitar demonstração', href: '/about', variant: 'secondary' },
                ]}
            />

            {/* ─── 2. CASO 1 — ATENDIMENTO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                        <div>
                            <SectionIntro
                                eyebrow="Caso 1"
                                title="Atendimento com contexto."
                                description="O operador nunca começa do zero. Cada conversa carrega o histórico completo do cliente."
                                align="left"
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute -top-4 -bottom-4 -left-3 -right-3 rounded-2xl border border-[hsl(var(--ui-border)/0.15)] bg-[hsl(var(--ui-surface)/0.1)]" />
                            <div className="relative z-10 p-2">
                                <OperationFlow
                                    steps={[
                                        { icon: MessageSquare, label: 'Cliente entra em contato', detail: 'Via WhatsApp, portal ou telefone.' },
                                        { icon: Users, label: 'Conversa organizada', detail: 'Associada ao cliente, pedidos abertos e histórico.', accent: 'var(--ui-success)' },
                                        { icon: Brain, label: 'Contexto preservado', detail: 'Pedidos, entregas, conversas anteriores — tudo visível.' },
                                        { icon: ScanSearch, label: 'Intenção detectada', detail: 'O sistema identifica: cotação, suporte, status ou reclamação.' },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 3. CASO 2 — SIMULAÇÃO E PEDIDO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                        <div className="order-2 lg:order-1 relative">
                            <div className="absolute -top-4 -bottom-4 -left-3 -right-3 rounded-2xl border border-[hsl(var(--ui-border)/0.15)] bg-[hsl(var(--ui-surface)/0.1)]" />
                            <div className="relative z-10 p-2">
                                <OperationFlow
                                    steps={[
                                        { icon: Package, label: 'Pedido solicitado', detail: 'Cliente informa origem, destino e peso.' },
                                        { icon: Zap, label: 'Simulação criada', detail: 'Cotação multi-transportadora em milissegundos.', accent: 'var(--ui-success)' },
                                        { icon: CheckCircle2, label: 'Opção escolhida', detail: 'Melhor custo-benefício selecionado.' },
                                        { icon: FileCheck, label: 'Pedido confirmado', detail: 'Registrado com responsável, estado e timeline.' },
                                    ]}
                                />
                            </div>
                        </div>
                        <div className="order-1 lg:order-2">
                            <SectionIntro
                                eyebrow="Caso 2"
                                title="Da simulação ao pedido."
                                description="Cotação instantânea, escolha informada e pedido registrado — sem digitar em planilha."
                                align="left"
                            />
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 4. CASO 3 — LOGÍSTICA ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                        <div>
                            <SectionIntro
                                eyebrow="Caso 3"
                                title="Logística rastreada."
                                description="Do despacho à entrega, cada etapa é visível. Exceções são tratadas antes de virar problema."
                                align="left"
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute -top-4 -bottom-4 -left-3 -right-3 rounded-2xl border border-[hsl(var(--ui-border)/0.15)] bg-[hsl(var(--ui-surface)/0.1)]" />
                            <div className="relative z-10 p-2">
                                <OperationFlow
                                    steps={[
                                        { icon: Truck, label: 'Pedido despachado', detail: 'Etiqueta gerada, coleta agendada.' },
                                        { icon: MapPin, label: 'Logística acompanhada', detail: 'Tracking ativo com timeline de eventos.', accent: 'var(--ui-success)' },
                                        { icon: AlertTriangle, label: 'Exceções tratadas', detail: 'Atrasos, devoluções e avarias detectados automaticamente.' },
                                        { icon: RefreshCw, label: 'Status atualizado', detail: 'Cockpit, cliente e operador informados em tempo real.' },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 5. VISÃO DA OPERAÇÃO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Cockpit"
                        title="Tudo visível em uma tela."
                        description="O cockpit consolida métricas, alertas e filas de ação. O gestor toma decisão com dado, não com feeling."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            { icon: LayoutDashboard, label: 'Dashboard unificado', desc: 'KPIs, volume e status da operação.' },
                            { icon: BarChart3, label: 'Métricas por módulo', desc: 'Frete, vendas, atendimento e IA.' },
                            { icon: AlertTriangle, label: 'Alertas em tempo real', desc: 'Exceções escaladas automaticamente.' },
                            { icon: Gauge, label: 'Saúde do sistema', desc: 'Health checks e circuit breakers.' },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label} className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 text-center">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] mx-auto mb-4">
                                        <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />
                                    </div>
                                    <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] mb-1 tracking-tight">{item.label}</h3>
                                    <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 6. BENEFÍCIOS ─── */}
            <PageSection spacing="md" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Resultado"
                        title="O que muda na operação."
                    />
                    <FeatureGrid
                        columns={4}
                        items={[
                            { icon: RefreshCw, title: 'Menos retrabalho', description: 'Informação uma vez, visível em todo o fluxo.' },
                            { icon: Eye, title: 'Mais visibilidade', description: 'Cada pedido, conversa e entrega rastreável.' },
                            { icon: Clock, title: 'Resposta mais rápida', description: 'Contexto instantâneo, ação imediata.' },
                            { icon: TrendingUp, title: 'Decisão com dados', description: 'Métricas reais, não intuição.' },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 7. CTA FINAL ─── */}
            <CTASection
                title="Quer ver como a plataforma se aplica à sua operação?"
                subtitle="Cada caso é diferente. Vamos conversar sobre o seu."
                ctas={[
                    { label: 'Explorar a plataforma', href: '/plataforma' },
                    { label: 'Solicitar demonstração', href: '/about', variant: 'secondary' },
                ]}
            />
        </>
    );
}
