import {
    MessageSquare, Search, Calculator, CheckCircle2,
    Package, Truck, Headphones, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro,
    ComparisonBand, CTASection, ScrollReveal,
} from '@/ui/site';
import { cn } from '@/lib/utils';

export const metadata = {
    title: 'Como funciona — Condstore OS',
    description: 'O fluxo operacional completo do Condstore OS: da entrada do lead à entrega confirmada. Veja como cada etapa funciona na prática.',
};

export const revalidate = 86400;

// ─── Types ────────────────────────────────────────────────────────────────────

interface JourneyStep {
    number: string;
    icon: LucideIcon;
    title: string;
    what: string;
    why: string;
    where: string;
    connects: string | null;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const JOURNEY_STEPS: JourneyStep[] = [
    {
        number: '01',
        icon: MessageSquare,
        title: 'Entrada do lead',
        what: 'O cliente chega pelo WhatsApp, e-mail ou formulário. O sistema registra o contato, abre um ticket no inbox e notifica o operador responsável — sem depender de anotação manual ou planilha paralela.',
        why: 'Nenhum lead some. Todo contato tem rastreabilidade desde o primeiro segundo, com timestamp e canal de origem.',
        where: 'Inbox',
        connects: 'O histórico do cliente já está disponível antes mesmo de responder — o operador entra na conversa com contexto.',
    },
    {
        number: '02',
        icon: Search,
        title: 'Entendimento do contexto',
        what: 'Antes de cotar, o operador acessa o perfil do cliente: pedidos anteriores, transportadoras utilizadas, volume mensal e pendências em aberto. Tudo consolidado em uma tela.',
        why: 'A resposta certa depende de entender quem está perguntando. Não existe boa cotação sem contexto real da operação.',
        where: 'CRM',
        connects: 'Com o perfil completo, o operador parte direto para a cotação — sem perguntar o que já está registrado.',
    },
    {
        number: '03',
        icon: Calculator,
        title: 'Geração de cotação',
        what: 'Cotação gerada em milissegundos com base em tabelas próprias e transportadoras configuradas. Múltiplas opções de prazo e custo, com margens aplicadas automaticamente conforme o perfil do cliente.',
        why: 'Cotação lenta perde venda. Cotação imprecisa corrói margem. O sistema elimina os dois riscos simultaneamente.',
        where: 'Envios',
        connects: 'O cliente recebe as opções estruturadas. O operador aguarda a decisão com todos os dados prontos para confirmar.',
    },
    {
        number: '04',
        icon: CheckCircle2,
        title: 'Validação e decisão',
        what: 'O cliente aprova a cotação. O operador confirma os dados de entrega e avança o pedido para criação — dentro do mesmo fluxo, sem trocar de ferramenta ou redigitar informação.',
        why: 'Fricção no momento de decisão significa pedido perdido. Cada clique a mais é chance de abandono.',
        where: 'Cockpit',
        connects: 'Com a decisão confirmada, o pedido é criado imediatamente e entra no painel com status visível.',
    },
    {
        number: '05',
        icon: Package,
        title: 'Criação do pedido',
        what: 'O pedido é registrado com dados do cliente, itens, transportadora selecionada e observações operacionais. NF pode ser vinculada. Status atualizado no painel em tempo real.',
        why: 'Pedido sem rastreabilidade interna é pedido com risco. Aqui cada pedido tem dono, status auditável e histórico completo.',
        where: 'Cockpit',
        connects: 'O pedido criado dispara o processo logístico imediatamente — sem etapa manual de transição.',
    },
    {
        number: '06',
        icon: Truck,
        title: 'Envio e operação logística',
        what: 'Etiqueta gerada, coleta agendada, rastreamento ativado. O sistema monitora o status de entrega em tempo real. Desvios e atrasos são sinalizados automaticamente no cockpit — sem dependência de consulta manual.',
        why: 'Logística sem monitoramento é operação no escuro. Cada evento registrado é uma chance de agir antes do cliente reclamar.',
        where: 'Envios + Cockpit',
        connects: 'O cliente acompanha o envio. O operador monitora desvios. O sistema alerta antes que o problema escale.',
    },
    {
        number: '07',
        icon: Headphones,
        title: 'Atendimento com contexto',
        what: 'Qualquer contato pós-pedido chega com contexto completo: status da entrega, histórico de interações, pendências abertas e dados do pedido. O operador responde sem precisar pesquisar em outro sistema.',
        why: 'Atendimento sem contexto gera ruído, perde tempo e frustra o cliente. Com o Condstore OS, a informação certa está disponível antes da pergunta chegar.',
        where: 'Inbox + CRM',
        connects: null,
    },
];

// ─── Inline Components ────────────────────────────────────────────────────────

function SystemBadge({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--ui-accent-blue)/0.2)] bg-[hsl(var(--ui-accent-blue)/0.06)] px-3 py-1 text-[11px] font-semibold tracking-wide text-[hsl(var(--ui-accent-blue))]">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--ui-accent-blue))] opacity-30" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--ui-accent-blue))]" />
            </span>
            {label}
        </span>
    );
}

function StepCard({ step, isLast }: { step: JourneyStep; isLast: boolean }) {
    const Icon = step.icon;

    return (
        <div className="relative grid grid-cols-1 lg:grid-cols-[72px_1fr_auto] gap-x-8 gap-y-5 items-start">
            {/* Step number + vertical connector */}
            <div className="relative hidden lg:flex flex-col items-center">
                <span
                    className="text-[64px] font-black leading-none tracking-tighter select-none"
                    style={{ color: 'hsl(var(--ui-border-strong))' }}
                    aria-hidden="true"
                >
                    {step.number}
                </span>
                {!isLast && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-[68px] bottom-[-56px] w-px bg-gradient-to-b from-[hsl(var(--ui-border)/0.8)] to-transparent" />
                )}
            </div>

            {/* Main content */}
            <div className="space-y-4">
                {/* Mobile step number */}
                <span
                    className="lg:hidden text-xs font-bold uppercase tracking-[0.2em]"
                    style={{ color: 'hsl(var(--ui-text-subtle))' }}
                >
                    Etapa {step.number}
                </span>

                {/* Title + icon */}
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: 'hsl(var(--ui-accent-blue) / 0.08)' }}
                    >
                        <Icon className="h-5 w-5" style={{ color: 'hsl(var(--ui-accent-blue))' }} />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-bold tracking-tight" style={{ color: 'hsl(var(--ui-text))' }}>
                        {step.title}
                    </h3>
                </div>

                {/* What happens */}
                <p className="text-base leading-relaxed max-w-2xl" style={{ color: 'hsl(var(--ui-text-muted))' }}>
                    {step.what}
                </p>

                {/* Why it matters — callout */}
                <div
                    className="flex items-start gap-4 rounded-xl border px-4 py-3"
                    style={{
                        borderColor: 'hsl(var(--ui-border) / 0.6)',
                        background: 'hsl(var(--ui-surface) / 0.5)',
                    }}
                >
                    <span
                        className="mt-0.5 shrink-0 text-[10px] font-black uppercase tracking-[0.18em] w-[52px]"
                        style={{ color: 'hsl(var(--ui-text-subtle))' }}
                    >
                        Por quê
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--ui-text-muted))' }}>
                        {step.why}
                    </p>
                </div>

                {/* Connection to next step */}
                {step.connects && (
                    <p
                        className="flex items-center gap-2 text-sm"
                        style={{ color: 'hsl(var(--ui-text-subtle))' }}
                    >
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{step.connects}</span>
                    </p>
                )}
            </div>

            {/* System badge — desktop right column */}
            <div className="hidden lg:block pt-1.5">
                <SystemBadge label={step.where} />
            </div>

            {/* System badge — mobile inline */}
            <div className="lg:hidden">
                <SystemBadge label={step.where} />
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SolucoesPage() {
    return (
        <>
            {/* ━━━ 1. INTRO ━━━ */}
            <PageSection spacing="xl">
                <PageContainer>
                    <div className="max-w-3xl">
                        <span
                            className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4"
                            style={{ color: 'hsl(var(--ui-accent-blue))' }}
                        >
                            Como funciona
                        </span>
                        <h1
                            className="text-4xl md:text-5xl lg:text-[3.5rem] font-black tracking-tight leading-[1.05]"
                            style={{ color: 'hsl(var(--ui-text))' }}
                        >
                            Da consulta ao envio.{' '}
                            <span style={{ color: 'hsl(var(--ui-text-subtle))' }}>
                                Sem lacuna.
                            </span>
                        </h1>
                        <p
                            className="mt-6 text-lg md:text-xl leading-relaxed max-w-2xl"
                            style={{ color: 'hsl(var(--ui-text-muted))' }}
                        >
                            O Condstore OS não é um conjunto de funcionalidades. É um fluxo operacional
                            completo — do primeiro contato do cliente até a entrega confirmada. Cada etapa
                            conectada à próxima, sem sistema paralelo, sem retrabalho.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-10">
                            <Link
                                href="/signup"
                                className="inline-flex items-center justify-center rounded-full text-sm font-bold h-12 px-8 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                style={{
                                    background: 'hsl(var(--ui-accent-blue))',
                                    color: 'hsl(0 0% 100%)',
                                    boxShadow: '0 8px 24px -8px hsl(var(--ui-accent-blue) / 0.3)',
                                }}
                            >
                                Começar agora
                            </Link>
                            <Link
                                href="/casos"
                                className="inline-flex items-center justify-center gap-2 rounded-full border text-sm font-bold h-12 px-8 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                style={{
                                    borderColor: 'hsl(var(--ui-border))',
                                    color: 'hsl(var(--ui-text))',
                                    background: 'transparent',
                                }}
                            >
                                Ver casos reais
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ━━━ 2. PIPELINE STRIP — visão compacta do fluxo ━━━ */}
            <ScrollReveal>
                <section
                    className="border-t py-6"
                    aria-label="Visão geral do fluxo operacional"
                    style={{ borderColor: 'hsl(var(--ui-border) / 0.5)' }}
                >
                    <PageContainer>
                        <div className="overflow-x-auto -mx-4 px-4">
                            <div className="flex items-start gap-0 min-w-max" role="list">
                                {JOURNEY_STEPS.map((step, i) => {
                                    const Icon = step.icon;
                                    const isLast = i === JOURNEY_STEPS.length - 1;
                                    return (
                                        <div key={step.number} className="flex items-start" role="listitem">
                                            <div className="flex flex-col items-center gap-2 px-4 py-2">
                                                <div
                                                    className="flex h-9 w-9 items-center justify-center rounded-full border"
                                                    style={{
                                                        background: 'hsl(var(--ui-accent-blue) / 0.07)',
                                                        borderColor: 'hsl(var(--ui-accent-blue) / 0.18)',
                                                    }}
                                                >
                                                    <Icon
                                                        className="h-4 w-4"
                                                        style={{ color: 'hsl(var(--ui-accent-blue))' }}
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                                <span
                                                    className="text-[11px] font-semibold text-center leading-tight max-w-[80px]"
                                                    style={{ color: 'hsl(var(--ui-text-subtle))' }}
                                                >
                                                    {step.title}
                                                </span>
                                            </div>
                                            {!isLast && (
                                                <div
                                                    className="w-6 h-px mt-[18px] shrink-0"
                                                    style={{ background: 'hsl(var(--ui-border) / 0.6)' }}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </PageContainer>
                </section>
            </ScrollReveal>

            {/* ━━━ 3. JORNADA OPERACIONAL ━━━ */}
            <PageSection spacing="xl" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Jornada operacional"
                        title="Cada etapa tem responsabilidade clara."
                        description="O que acontece em cada momento — e por que cada detalhe foi construído assim."
                        align="left"
                    />

                    <div className="space-y-14 md:space-y-16" role="list" aria-label="Etapas do fluxo operacional">
                        {JOURNEY_STEPS.map((step, i) => (
                            <ScrollReveal key={step.number} delay={i * 50}>
                                <div role="listitem">
                                    <StepCard
                                        step={step}
                                        isLast={i === JOURNEY_STEPS.length - 1}
                                    />
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ━━━ 4. ANTES E DEPOIS ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Antes e depois"
                            title="O que muda quando o fluxo é estruturado."
                        />
                        <ComparisonBand
                            left={{
                                label: 'Sem o Condstore OS',
                                tone: 'negative',
                                items: [
                                    'Lead entra pelo WhatsApp e some se ninguém anotar',
                                    'Cotação feita por telefone — 15 a 20 minutos por pedido',
                                    'Pedido registrado em planilha desatualizada ou no papel',
                                    'Status de entrega desconhecido até o cliente reclamar',
                                    'Atendimento sem histórico — operador pergunta o que já foi dito',
                                    'Erro de cotação corrói margem sem que ninguém perceba',
                                    'Cada troca de ferramenta é uma chance de falha',
                                ],
                            }}
                            right={{
                                label: 'Com o Condstore OS',
                                tone: 'positive',
                                items: [
                                    'Lead registrado automaticamente no inbox com canal e histórico',
                                    'Cotação gerada em milissegundos com tabelas próprias',
                                    'Pedido criado no mesmo fluxo da aprovação — sem redigitar',
                                    'Rastreamento ativo desde o despacho, alertas automáticos de desvio',
                                    'Atendimento com contexto completo: pedido, envio e histórico',
                                    'Margens aplicadas automaticamente em cada cotação',
                                    'Fluxo único, sem troca de ferramenta, sem retrabalho',
                                ],
                            }}
                        />
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 5. PONTE PARA PROVA OPERACIONAL ━━━ */}
            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <div
                            className="rounded-2xl border p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                            style={{
                                borderColor: 'hsl(var(--ui-border) / 0.6)',
                                background: 'hsl(var(--ui-surface) / 0.5)',
                            }}
                        >
                            <div>
                                <span
                                    className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-3"
                                    style={{ color: 'hsl(var(--ui-accent-blue))' }}
                                >
                                    Prova operacional
                                </span>
                                <h2
                                    className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight"
                                    style={{ color: 'hsl(var(--ui-text))' }}
                                >
                                    Veja como isso funciona na operação real.
                                </h2>
                                <p
                                    className="mt-4 text-base leading-relaxed"
                                    style={{ color: 'hsl(var(--ui-text-muted))' }}
                                >
                                    Casos documentados de operações que eliminaram planilhas, reduziram tempo
                                    de cotação e ganharam visibilidade total sobre envios.
                                </p>
                            </div>
                            <div className={cn(
                                'flex flex-col sm:flex-row md:flex-col lg:flex-row gap-4',
                                'md:items-start lg:items-center md:justify-end'
                            )}>
                                <Link
                                    href="/casos"
                                    className="inline-flex items-center justify-center rounded-full text-sm font-bold h-12 px-8 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                    style={{
                                        background: 'hsl(var(--ui-accent-blue))',
                                        color: 'hsl(0 0% 100%)',
                                        boxShadow: '0 8px 24px -8px hsl(var(--ui-accent-blue) / 0.25)',
                                    }}
                                >
                                    Ver casos reais
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border text-sm font-bold h-12 px-8 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                    style={{
                                        borderColor: 'hsl(var(--ui-border))',
                                        color: 'hsl(var(--ui-text))',
                                        background: 'transparent',
                                    }}
                                >
                                    Acessar o sistema
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </Link>
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 6. CTA FINAL ━━━ */}
            <CTASection
                title="Pronto para operar sem lacuna?"
                subtitle="Comece com o fluxo completo ou escolha o módulo que resolve o problema mais urgente agora."
                ctas={[
                    { label: 'Começar agora', href: '/signup' },
                    { label: 'Falar com o time', href: '/contato', variant: 'secondary' },
                ]}
            />
        </>
    );
}
