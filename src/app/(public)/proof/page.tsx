import {
    MessageSquare, Users, Zap, FileCheck, LayoutDashboard,
    Inbox, Package, Truck, BarChart3, Bot,
    Shield, Eye, CheckCircle2, ClipboardList,
    ArrowRight,
} from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection,
    OperationFlow, CTASection, ScrollReveal,
} from '@/ui/site';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Prova operacional — Condstore OS',
    description: 'Veja o Condstore OS em operação real: inbox, cotações e pedidos gerenciados por uma plataforma que já funciona no dia a dia de operações B2B.',
};

export const revalidate = 86400;

export default function ProofPage() {
    return (
        <>
            {/* ━━━ 1. HERO ━━━ */}
            <HeroSection
                eyebrow="Operação real"
                title={
                    <>
                        Não é demonstração.{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            É o sistema em produção.
                        </span>
                    </>
                }
                subtitle="O Condstore OS opera hoje em ambientes reais — gerenciando pedidos, atendimento e frete de operações B2B no Brasil."
                ctas={[
                    { label: 'Falar com o time', href: '/contato' },
                    { label: 'Entrar na plataforma', href: '/login', variant: 'secondary' },
                ]}
            />

            {/* ━━━ 2. COMO FUNCIONA NA PRÁTICA ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop id="fluxo">
                    <PageContainer>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
                            <div className="lg:sticky lg:top-32">
                                <SectionIntro
                                    eyebrow="Fluxo real"
                                    title="Do lead à operação, sem ponto cego."
                                    description="Cada etapa conecta a próxima. O contexto nunca se perde. O operador nunca começa do zero."
                                    align="left"
                                />
                                <div className="mt-8 flex flex-col gap-2">
                                    {[
                                        { label: 'Lead chega via WhatsApp ou portal', done: true },
                                        { label: 'Conversa organizada e cliente identificado', done: true },
                                        { label: 'Cotação multi-transportadora gerada', done: true },
                                        { label: 'Pedido registrado com estado e responsável', done: true },
                                        { label: 'Cockpit atualizado em fluxo integrado', done: true },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center gap-3">
                                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[hsl(var(--ui-success))]" />
                                            <span className="text-sm text-[hsl(var(--ui-text-muted))] font-medium">
                                                {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute -top-8 -bottom-8 -left-4 -right-4 rounded-3xl border border-[hsl(var(--ui-border)/0.2)] bg-[hsl(var(--ui-surface)/0.15)]" />
                                <div className="relative z-10 p-2 md:p-4">
                                    <OperationFlow
                                        steps={[
                                            {
                                                icon: MessageSquare,
                                                label: 'Lead recebido',
                                                detail: 'Mensagem capturada via WhatsApp, portal ou API. Associada ao cliente automaticamente.',
                                            },
                                            {
                                                icon: Users,
                                                label: 'Conversa organizada',
                                                detail: 'Histórico, pedidos abertos e contexto completo disponíveis antes da primeira resposta.',
                                                accent: 'var(--ui-success)',
                                            },
                                            {
                                                icon: Zap,
                                                label: 'Cotação gerada',
                                                detail: 'Multi-transportadora em milissegundos. Margem calculada. Sem telefonema.',
                                            },
                                            {
                                                icon: FileCheck,
                                                label: 'Pedido confirmado',
                                                detail: 'Registrado com responsável, estado e timeline auditável.',
                                                accent: 'var(--ui-success)',
                                            },
                                            {
                                                icon: LayoutDashboard,
                                                label: 'Operação atualizada',
                                                detail: 'Cockpit, métricas e SLA alimentados. Ciclo fechado sem ação manual.',
                                            },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 3. VISÃO DO COCKPIT ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop id="cockpit">
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Cockpit OS"
                            title="O centro de comando da operação."
                            description="Inbox, cotações e pedidos em uma interface — construída para operadores que precisam agir rápido."
                        />

                        {/* Browser chrome mockup */}
                        <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-surface)/0.3)] backdrop-blur-sm overflow-hidden shadow-2xl shadow-[hsl(var(--ui-accent-blue)/0.05)]">
                            {/* Window bar */}
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--ui-border)/0.2)] bg-[hsl(var(--ui-surface)/0.5)]">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--ui-danger)/0.4)]" />
                                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--ui-warning)/0.4)]" />
                                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--ui-success)/0.4)]" />
                                </div>
                                <div className="flex-1 flex justify-center">
                                    <div className="px-4 py-1 rounded-md bg-[hsl(var(--ui-surface-elevated)/0.5)] text-[10px] font-medium text-[hsl(var(--ui-text-subtle))]">
                                        app.condstore.com.br/cockpit
                                    </div>
                                </div>
                            </div>

                            {/* Cockpit layout */}
                            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Inbox card */}
                                <div className="rounded-xl border border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-surface)/0.4)] p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--ui-accent-blue)/0.1)]">
                                                <Inbox className="h-4 w-4 text-[hsl(var(--ui-accent-blue))]" />
                                            </div>
                                            <span className="text-xs font-bold text-[hsl(var(--ui-text))] uppercase tracking-wide">Inbox</span>
                                        </div>
                                        <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-[hsl(var(--ui-accent-blue))] text-[10px] font-bold text-white px-1.5">
                                            12
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {[
                                            { name: 'Distribuidora ABC', msg: 'Preciso de cotação urgente', time: '9h14', new: true },
                                            { name: 'Transportes RS', msg: 'Confirmar pedido #2847', time: '9h02', new: true },
                                            { name: 'Logística Sul', msg: 'Status da entrega?', time: '8h55', new: false },
                                        ].map((item) => (
                                            <div key={item.name} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[hsl(var(--ui-surface-elevated)/0.3)] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)] transition-colors">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--ui-accent-blue)/0.15)] flex-shrink-0 text-[10px] font-bold text-[hsl(var(--ui-accent-blue))]">
                                                    {item.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-[11px] font-semibold text-[hsl(var(--ui-text))] truncate">{item.name}</span>
                                                        <span className="text-[10px] text-[hsl(var(--ui-text-subtle))] flex-shrink-0">{item.time}</span>
                                                    </div>
                                                    <span className="text-[10px] text-[hsl(var(--ui-text-muted))] truncate block">{item.msg}</span>
                                                </div>
                                                {item.new && (
                                                    <div className="flex-shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-[hsl(var(--ui-accent-blue))]" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Cotações card */}
                                <div className="rounded-xl border border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-surface)/0.4)] p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--ui-success)/0.1)]">
                                                <Zap className="h-4 w-4 text-[hsl(var(--ui-success))]" />
                                            </div>
                                            <span className="text-xs font-bold text-[hsl(var(--ui-text))] uppercase tracking-wide">Cotações</span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-[hsl(var(--ui-success))]">↑ 8 hoje</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {[
                                            { id: '#C-0412', rota: 'SP → RS', valor: 'R$ 187,00', status: 'Aprovada' },
                                            { id: '#C-0411', rota: 'SP → MG', valor: 'R$ 94,50', status: 'Aprovada' },
                                            { id: '#C-0410', rota: 'RJ → SP', valor: 'R$ 132,00', status: 'Pendente' },
                                        ].map((item) => (
                                            <div key={item.id} className="p-2.5 rounded-lg bg-[hsl(var(--ui-surface-elevated)/0.3)]">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-mono font-bold text-[hsl(var(--ui-text-subtle))]">{item.id}</span>
                                                    <span className={`text-[10px] font-semibold ${item.status === 'Aprovada' ? 'text-[hsl(var(--ui-success))]' : 'text-[hsl(var(--ui-warning))]'}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-[11px] text-[hsl(var(--ui-text-muted))]">{item.rota}</span>
                                                    <span className="text-[11px] font-bold text-[hsl(var(--ui-text))]">{item.valor}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Pedidos card */}
                                <div className="rounded-xl border border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-surface)/0.4)] p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--ui-accent-blue)/0.1)]">
                                                <Package className="h-4 w-4 text-[hsl(var(--ui-accent-blue))]" />
                                            </div>
                                            <span className="text-xs font-bold text-[hsl(var(--ui-text))] uppercase tracking-wide">Pedidos</span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-[hsl(var(--ui-text-muted))]">47 ativos</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {[
                                            { id: '#P-2851', cliente: 'Distribuidora ABC', etapa: 'Em transporte', urgente: false },
                                            { id: '#P-2850', cliente: 'Logística Sul', etapa: 'Aguardando coleta', urgente: true },
                                            { id: '#P-2849', cliente: 'Transportes RS', etapa: 'Entregue', urgente: false },
                                        ].map((item) => (
                                            <div key={item.id} className="p-2.5 rounded-lg bg-[hsl(var(--ui-surface-elevated)/0.3)]">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-mono font-bold text-[hsl(var(--ui-text-subtle))]">{item.id}</span>
                                                    {item.urgente && (
                                                        <span className="text-[10px] font-semibold text-[hsl(var(--ui-warning))]">Atenção</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-[11px] text-[hsl(var(--ui-text-muted))] truncate">{item.cliente}</span>
                                                    <span className="text-[11px] font-semibold text-[hsl(var(--ui-text))]">{item.etapa}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Stat bar */}
                                    <div className="mt-3 pt-3 border-t border-[hsl(var(--ui-border)/0.2)] grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Hoje', value: '47' },
                                            { label: 'SLA', value: '98%' },
                                            { label: 'Margem', value: 'R$3.4k' },
                                        ].map((stat) => (
                                            <div key={stat.label} className="text-center">
                                                <span className="block text-[10px] text-[hsl(var(--ui-text-subtle))]">{stat.label}</span>
                                                <span className="block text-sm font-bold text-[hsl(var(--ui-text))]">{stat.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-center text-xs text-[hsl(var(--ui-text-subtle))] mt-4">
                            Interface representativa do Cockpit OS — dados ilustrativos do padrão operacional real.
                        </p>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 4. PROVA REAL — LOJACOND ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop id="lojacond">
                    <PageContainer>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <SectionIntro
                                    eyebrow="Caso real"
                                    title="Operação CONDSTORE OS."
                                    description="A plataforma foi construída a partir de uma operação real — não de uma hipótese de produto."
                                    align="left"
                                />
                                <div className="mt-2 flex flex-col gap-6">
                                    <p className="text-base text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                        A CONDSTORE OS opera como distribuidora B2B atendendo condomínios e administradoras em São Paulo.
                                        O fluxo cobre cotação de frete, gestão de pedidos e atendimento via WhatsApp — tudo no mesmo ambiente operacional.
                                    </p>
                                    <p className="text-base text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                        O Condstore OS nasceu para resolver os problemas reais dessa operação: cotações manuais, pedidos sem estado definido e atendimento desconectado da logística.
                                        O sistema entrou em produção e passou a gerir o ciclo completo.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    {
                                        icon: Truck,
                                        label: 'Frete B2B',
                                        desc: 'Multi-transportadora com tabelas próprias e cálculo automático de margem.',
                                    },
                                    {
                                        icon: MessageSquare,
                                        label: 'Atendimento via WhatsApp',
                                        desc: 'Conversas vinculadas a pedidos e histórico do cliente.',
                                    },
                                    {
                                        icon: ClipboardList,
                                        label: 'Pedidos rastreados',
                                        desc: 'Do registro à entrega — estado visível a cada etapa.',
                                    },
                                    {
                                        icon: BarChart3,
                                        label: 'Métricas reais',
                                        desc: 'Volume, SLA e margem por transportadora acompanhados no cockpit.',
                                    },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div
                                            key={item.label}
                                            className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-5 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.4)]"
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.08)] mb-3">
                                                <Icon className="h-4 w-4 text-[hsl(var(--ui-accent-blue))]" />
                                            </div>
                                            <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] mb-1 tracking-tight">{item.label}</h3>
                                            <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 5. CONFIANÇA ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop id="confianca">
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Governança"
                            title="Controle que não abre mão da supervisão."
                            description="O Condstore OS opera em modo supervisionado. A IA sugere, o operador decide. Cada ação é registrada."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            {[
                                {
                                    icon: Users,
                                    accent: 'ui-accent-blue',
                                    title: 'Controle humano',
                                    desc: 'O Frank Supremo opera com budget controlado. Toda ação de IA passa por revisão do operador antes de ser executada.',
                                },
                                {
                                    icon: Eye,
                                    accent: 'ui-accent-blue',
                                    title: 'Rastreabilidade total',
                                    desc: 'Cada pedido, conversa e cotação tem um audit trail completo: quem fez, quando e com qual resultado.',
                                },
                                {
                                    icon: Shield,
                                    accent: 'ui-danger',
                                    title: 'Segurança por design',
                                    desc: 'Multi-tenant isolado, RBAC granular e detecção de anomalias. Nenhuma ação sensível ocorre sem registro.',
                                },
                                {
                                    icon: Bot,
                                    accent: 'ui-accent-blue',
                                    title: 'IA governada',
                                    desc: 'A inteligência artificial analisa e sugere — a palavra final é sempre do operador. Sem automação cega.',
                                },
                            ].map((item) => {
                                const Icon = item.icon;
                                const isDanger = item.accent === 'ui-danger';
                                return (
                                    <div
                                        key={item.title}
                                        className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.4)]"
                                    >
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-4 ${isDanger ? 'bg-[hsl(var(--ui-danger)/0.08)]' : 'bg-[hsl(var(--ui-accent-blue)/0.08)]'}`}>
                                            <Icon className={`h-5 w-5 ${isDanger ? 'text-[hsl(var(--ui-danger))]' : 'text-[hsl(var(--ui-accent-blue))]'}`} />
                                        </div>
                                        <h3 className="text-base font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">{item.title}</h3>
                                        <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Supervised mode note */}
                        <div className="mt-10 rounded-2xl border border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-surface)/0.2)] px-6 py-5 flex items-start gap-4">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--ui-success)/0.1)]">
                                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--ui-success))]" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[hsl(var(--ui-text))] mb-1">
                                    Modo supervisionado ativo
                                </p>
                                <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                    O sistema opera em modo SUPERVISED_ONLY por padrão. Nenhuma ação autônoma ocorre sem aprovação explícita do operador responsável.
                                    Autonomia se ganha por histórico — não é liberada por padrão.
                                </p>
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 6. NAVEGAÇÃO ENTRE MÓDULOS ━━━ */}
            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Ver a plataforma', sub: 'Cockpit OS e módulos', href: '/plataforma', icon: LayoutDashboard },
                                { label: 'Como funciona', sub: 'Fluxo operacional', href: '/como-funciona', icon: Zap },
                                { label: 'Soluções', sub: 'Módulos disponíveis', href: '/solucoes', icon: Package },
                                { label: 'Falar com o time', sub: 'Demonstração guiada', href: '/contato', icon: Users },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="group rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.2)] p-5 flex flex-col gap-3 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface)/0.4)]"
                                    >
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.08)] transition-colors group-hover:bg-[hsl(var(--ui-accent-blue)/0.12)]">
                                            <Icon className="h-4 w-4 text-[hsl(var(--ui-accent-blue))]" />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-[hsl(var(--ui-text))] tracking-tight group-hover:text-[hsl(var(--ui-accent-blue))] transition-colors">
                                                {item.label}
                                            </span>
                                            <span className="block text-xs text-[hsl(var(--ui-text-muted))] mt-0.5">{item.sub}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-[hsl(var(--ui-text-subtle))] group-hover:text-[hsl(var(--ui-accent-blue))] transition-colors mt-auto" />
                                    </Link>
                                );
                            })}
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 7. CTA FINAL ━━━ */}
            <CTASection
                title="Quer ver o sistema operando na sua realidade?"
                subtitle="Operações reais têm contextos únicos. Vamos entender o seu antes de recomendar qualquer coisa."
                ctas={[
                    { label: 'Falar com o time', href: '/contato' },
                    { label: 'Entrar na plataforma', href: '/login', variant: 'secondary' },
                ]}
            />
        </>
    );
}
