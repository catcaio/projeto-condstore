import Link from 'next/link';
import {
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    Lock,
    MessageSquare,
    UserCheck,
    Repeat,
    FileText,
    ShoppingBag,
    Truck,
    AlertCircle,
    Layers,
    Server,
    Clock,
    Zap,
} from 'lucide-react';
import { AgilizapInteractiveFlow } from '@/ui/site/agilizap-interactive-flow';

export const metadata = {
    title: 'AGILIZAP — Fluxo comercial contínuo do contato à entrega',
    description: 'AGILIZAP transforma contatos, negociações e operações fragmentadas em um fluxo comercial contínuo com supervisão humana e IA Frank.',
};

export const revalidate = 86400;

const primaryCtaClass = 'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#3E5CFF] px-7 text-sm font-semibold text-white transition-all hover:bg-[#3E5CFF]/90 shadow-lg shadow-[#3E5CFF]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5CFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0E13]';
const secondaryCtaClass = 'inline-flex h-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 px-7 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0E13]';

const problemItems = [
    {
        icon: MessageSquare,
        title: 'Atendimento fragmentado em abas',
        description: 'Conversas ocorrem no WhatsApp sem visibilidade da conta do cliente, do histórico financeiro ou de tratativas anteriores.',
    },
    {
        icon: Repeat,
        title: 'Perda de contexto na troca de canal',
        description: 'Quando o comprador alterna entre e-mail e WhatsApp, o histórico de termos e descontos se perde, gerando atrito.',
    },
    {
        icon: FileText,
        title: 'Propostas e orçamentos sem rastro',
        description: 'Versões de orçamento (v1, v2, v3) negociadas informalmente causam erros de preço na emissão final do pedido.',
    },
    {
        icon: Truck,
        title: 'Logística desconectada da venda',
        description: 'Cotação de frete, escolha de transportadora e rastreio rodam em sistemas isolados, exigindo digitação duplicada.',
    },
];

const causalSteps = [
    {
        number: '01',
        title: 'Canal de Entrada Multicanal',
        description: 'Mensagens vindas de WhatsApp Business, e-mail, marketplace ou entrada manual entram diretamente no fluxo comercial.',
        icon: MessageSquare,
    },
    {
        number: '02',
        title: 'Identidade do Cliente Resolvida',
        description: 'O comprador é identificado e vinculado à sua conta comercial. Todo o histórico fica acessível instantaneamente.',
        icon: UserCheck,
    },
    {
        number: '03',
        title: 'Negociação Comercial Contínua',
        description: 'A negociação sobrevive à mudança de canal e à reabertura da conversa, preservando o contexto sem repetições.',
        icon: Repeat,
    },
    {
        number: '04',
        title: 'Proposta Revisável em Versões',
        description: 'Gestão de versões (v1, v2, v3) com alteração transparente de itens, descontos e frete até o aceite final.',
        icon: FileText,
    },
    {
        number: '05',
        title: 'Conversão em Pedido de Venda',
        description: 'O pedido nasce da proposta aprovada, garantindo conformidade de valores, itens e prazos sem re-digitação.',
        icon: ShoppingBag,
    },
    {
        number: '06',
        title: 'Execução & Logística Integrada',
        description: 'Cotação multicarrier, alocação de transportadora e envio automático do rastreio ao comprador.',
        icon: Truck,
    },
];

export default function HomePage() {
    return (
        <div className="bg-[#0B0E13] text-slate-100 min-h-screen selection:bg-[#3E5CFF]/30 selection:text-white">
            {/* HERO SECTION */}
            <section className="relative border-b border-slate-800/80 pt-12 md:pt-20 pb-16 md:pb-24 overflow-hidden">
                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

                <div className="relative mx-auto max-w-[var(--container-max-width)] px-6 lg:px-8">
                    <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
                        {/* Eyebrow Label */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#3E5CFF]/30 bg-[#3E5CFF]/10 text-xs font-mono font-medium tracking-wider text-[#3E5CFF] mb-6">
                            <Zap className="w-3.5 h-3.5" />
                            <span>AGILIZAP :: OPERAÇÃO COMERCIAL CONTINUA</span>
                        </div>

                        {/* Main Headline */}
                        <h1
                            data-testid="public-hero-title"
                            className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-white"
                        >
                            AGILIZAP transforma contatos, negociações e operações fragmentadas em um{' '}
                            <span className="text-[#3E5CFF] underline decoration-[#3E5CFF]/40 underline-offset-8">
                                fluxo comercial contínuo.
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed font-body max-w-3xl font-normal">
                            Do primeiro WhatsApp à entrega logística. Conecte canais, identidades, propostas revisáveis e pedidos em um processo unificado com inteligência supervisionada.
                        </p>

                        {/* CTAs */}
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                            <Link
                                href="/piloto"
                                className={primaryCtaClass}
                                data-testid="public-primary-cta"
                            >
                                Solicitar avaliação operacional
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link href="/login" className={secondaryCtaClass}>
                                Entrar no sistema
                            </Link>
                        </div>
                    </div>

                    {/* Signature Visual Element: Interactive Product Showcase */}
                    <div id="produto" className="mt-14 md:mt-18 pt-6">
                        <div className="text-center mb-6">
                            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                                PROVA VIVA DO PRODUTO EM AÇÃO
                            </span>
                            <h2 className="text-lg font-bold font-headline text-slate-200 mt-1">
                                Acompanhe a sequência de execução comercial em tempo real
                            </h2>
                        </div>
                        <AgilizapInteractiveFlow />
                    </div>
                </div>
            </section>

            {/* O PROBLEMA */}
            <section className="py-20 border-b border-slate-800/80 bg-slate-950/40">
                <div className="mx-auto max-w-[var(--container-max-width)] px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold">
                            DIAGNÓSTICO DA OPERAÇÃO
                        </span>
                        <h2 className="mt-3 text-3xl sm:text-4xl font-bold font-headline text-white tracking-tight">
                            A fragmentação operacional destrói sua margem comercial.
                        </h2>
                        <p className="mt-4 text-base text-slate-300 leading-relaxed font-body">
                            Quando o atendimento no WhatsApp não conversa com a cotação de frete e o pedido de venda exige digitação manual, cada negociação se transforma em um gargalo.
                        </p>
                    </div>

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {problemItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <article
                                    key={item.title}
                                    className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors"
                                >
                                    <div>
                                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5 border border-amber-500/20">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-base font-bold font-headline text-white mb-2">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-slate-400 leading-relaxed font-body">
                                            {item.description}
                                        </p>
                                    </div>
                                    <div className="mt-6 pt-3 border-t border-slate-800/60 font-mono text-[11px] text-slate-500">
                                        ESTADO INITIAL :: FRAGMENTADO
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* COMO FUNCIONA */}
            <section id="como-funciona" className="py-20 border-b border-slate-800/80">
                <div className="mx-auto max-w-[var(--container-max-width)] px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <span className="text-xs font-mono uppercase tracking-widest text-[#3E5CFF] font-semibold">
                            CADEIA CAUSAL DO PRODUTO
                        </span>
                        <h2 className="mt-3 text-3xl sm:text-4xl font-bold font-headline text-white tracking-tight">
                            Como o AGILIZAP opera de ponta a ponta
                        </h2>
                        <p className="mt-4 text-base text-slate-300 leading-relaxed font-body">
                            Uma cadeia comercial contínua em 6 passos diretos, eliminando ruídos e garantindo rastreabilidade do primeiro contato à entrega final.
                        </p>
                    </div>

                    <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {causalSteps.map((step) => {
                            const Icon = step.icon;
                            return (
                                <div
                                    key={step.number}
                                    className="relative rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-[#3E5CFF]/50 transition-colors group"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-[#3E5CFF]/15 text-[#3E5CFF] border border-[#3E5CFF]/30">
                                                PASSO {step.number}
                                            </span>
                                            <Icon className="w-5 h-5 text-slate-400 group-hover:text-[#3E5CFF] transition-colors" />
                                        </div>
                                        <h3 className="text-lg font-bold font-headline text-white mb-2">
                                            {step.title}
                                        </h3>
                                        <p className="text-sm text-slate-400 leading-relaxed font-body">
                                            {step.description}
                                        </p>
                                    </div>
                                    <div className="mt-6 pt-3 border-t border-slate-800/60 font-mono text-[11px] text-[#17C964] flex items-center gap-1.5 font-semibold">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        FLUXO CONTINUO GARANTIDO
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* FRANK AI SECTION */}
            <section id="frank-ai" className="py-20 border-b border-slate-800/80 bg-slate-950/60 relative overflow-hidden">
                <div className="mx-auto max-w-[var(--container-max-width)] px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#3E5CFF]/40 bg-[#3E5CFF]/10 text-xs font-mono font-medium text-[#3E5CFF] mb-4">
                                <ShieldCheck className="w-4 h-4" />
                                <span>IA FRANK :: COPILOTO SUPERVISIONADO</span>
                            </div>

                            <h2 className="text-3xl sm:text-4xl font-bold font-headline text-white tracking-tight">
                                Inteligência operacional com governança e aprovação humana.
                            </h2>

                            <p className="mt-4 text-base text-slate-300 leading-relaxed font-body">
                                Frank atua como um copiloto especialista integrado diretamente ao fluxo comercial. Ele lê o contexto de mensagens, calcula cotações e sugere ações — mas nunca toma decisões financeiras sozinho.
                            </p>

                            <div className="mt-8 space-y-4 font-body">
                                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-3.5">
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold font-headline text-white">
                                            Gate Humano Obligatório para Ações de Risco
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed mt-1">
                                            Alteração de valores de pedido, conceder descontos especiais ou autorizar emissões de frete dependem da aprovação direta do operador no cockpit.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-3.5">
                                    <div className="p-2 rounded-lg bg-[#3E5CFF]/10 text-[#3E5CFF] shrink-0 mt-0.5">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold font-headline text-white">
                                            Rastreabilidade e Auditoria Completa
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed mt-1">
                                            Cada sugestão do Frank e cada confirmação do operador ficam registradas na linha do tempo com data, horário e responsável.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Risk Gate Display Visual */}
                        <div className="lg:col-span-6">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8 space-y-6 shadow-xl">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-[#3E5CFF]" />
                                        <span className="font-mono text-sm font-bold text-white">GATE DE GOVERNANÇA OPERACIONAL</span>
                                    </div>
                                    <span className="px-2.5 py-1 rounded bg-[#17C964]/15 text-[#17C964] border border-[#17C964]/30 font-mono text-xs font-bold">
                                        STATUS :: AMBIENTE SUPERVISIONADO
                                    </span>
                                </div>

                                <div className="space-y-4 font-mono text-xs">
                                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                                        <div className="flex justify-between text-slate-400">
                                            <span>Sugestão Frank #FK-4019</span>
                                            <span className="text-amber-400 font-bold">REQUER APROVAÇÃO</span>
                                        </div>
                                        <p className="text-slate-200 font-body text-xs">
                                            "Desconto comercial de 5% solicitado pelo cliente via WhatsApp na Proposta v2. Limite operacional dentro do parâmetro."
                                        </p>
                                        <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500 border-t border-slate-800">
                                            <span>Impacto na Margem: -R$ 625,00</span>
                                            <span>Risco: Médio</span>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-lg bg-[#3E5CFF]/10 border border-[#3E5CFF]/30 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-[#3E5CFF]" />
                                            <span className="text-white font-bold">Ação Financeira Bloqueada até Aceite</span>
                                        </div>
                                        <span className="px-3 py-1.5 rounded bg-[#3E5CFF] text-white font-bold text-[11px]">
                                            [ Aguardando Operador ]
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MULTI-TENANT & ARQUITETURA */}
            <section id="tecnologia" className="py-20 border-b border-slate-800/80">
                <div className="mx-auto max-w-[var(--container-max-width)] px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-semibold">
                            SEGURANÇA &amp; ARQUITETURA DE ENTERPRISE
                        </span>
                        <h2 className="mt-3 text-3xl sm:text-4xl font-bold font-headline text-white tracking-tight">
                            Multi-tenant nativo desde a concepção.
                        </h2>
                        <p className="mt-4 text-base text-slate-300 leading-relaxed font-body">
                            Cada empresa opera em um ambiente isolado com segregação de dados rigorosa, controle de acesso baseado em papéis (RBAC) e auditabilidade completa.
                        </p>
                    </div>

                    <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 font-body">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                            <div className="w-10 h-10 rounded-lg bg-[#3E5CFF]/10 text-[#3E5CFF] flex items-center justify-center mb-4 border border-[#3E5CFF]/20">
                                <Server className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold font-headline text-white mb-2">
                                Isolamento Estrito de Tenant
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Nenhum dado comercial, cliente ou proposta vaza entre empresas. O isolamento é aplicado por chave de tenant em nível de banco de dados e aplicação.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                            <div className="w-10 h-10 rounded-lg bg-[#3E5CFF]/10 text-[#3E5CFF] flex items-center justify-center mb-4 border border-[#3E5CFF]/20">
                                <Layers className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold font-headline text-white mb-2">
                                Gestão de Acessos &amp; Papéis (RBAC)
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Defina permissões claras entre operadores, gestores comerciais e supervisores de logística com controle granular de visualização e edição.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                            <div className="w-10 h-10 rounded-lg bg-[#3E5CFF]/10 text-[#3E5CFF] flex items-center justify-center mb-4 border border-[#3E5CFF]/20">
                                <Clock className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold font-headline text-white mb-2">
                                Trilha Rastreável de Auditoria
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Cada aceite de cotação, criação de pedido e expedição fica registrado em linha do tempo auditável com usuário, horário e IP.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA FINAL */}
            <section className="py-20 md:py-28 bg-gradient-to-b from-[#0B0E13] to-slate-950">
                <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#3E5CFF] font-semibold">
                        AVALIAÇÃO OPERACIONAL AGILIZAP
                    </span>

                    <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold font-headline text-white tracking-tight">
                        Transforme a fragmentação da sua operação em fluxo comercial contínuo.
                    </h2>

                    <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-body">
                        Sem discursos vagos de automação autônoma. Conheça como o AGILIZAP une WhatsApp, propostas revisáveis e logística com supervisão humana real.
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/piloto" className={primaryCtaClass}>
                            Solicitar avaliação operacional
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link href="/login" className={secondaryCtaClass}>
                            Entrar no sistema
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
