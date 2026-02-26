import Link from 'next/link';
import { Truck, BarChart3, Bot, CheckCircle2 } from 'lucide-react';

export default function PublicHomePage() {
    const isDev = process.env.NODE_ENV === 'development';

    return (
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-32 flex flex-col items-center text-center gap-16">

            <div className="max-w-3xl space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight text-[hsl(var(--ui-text))]">
                    Automatize o frete da sua loja em <span className="text-[hsl(var(--ui-accent-blue))]">minutos.</span>
                </h1>
                <p className="text-lg md:text-xl text-[hsl(var(--ui-text-muted))] max-w-2xl mx-auto leading-relaxed">
                    Cotações inteligentes, múltiplas transportadoras e automação via WhatsApp.
                    Escalonamento sem aumentar sua folha de pagamentos.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                    <Link
                        href="/pricing"
                        className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-full bg-[hsl(var(--ui-text))] px-8 text-base font-medium text-[hsl(var(--ui-bg))] hover:opacity-90 shadow-lg tracking-wide transition-all"
                    >
                        Começar agora
                    </Link>
                    <Link
                        href={isDev ? '/cockpit/audit?status=success' : '/docs'}
                        className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-full bg-[hsl(var(--ui-muted))] px-8 text-base font-medium text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-border)/0.5)] transition-all"
                    >
                        Ver demo
                    </Link>
                </div>
            </div>

            <div className="py-12 border-y border-[hsl(var(--ui-border)/0.5)] w-full grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-[hsl(var(--ui-accent-blue)/0.1)] flex items-center justify-center text-[hsl(var(--ui-accent-blue))]">
                        <Truck className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[hsl(var(--ui-text))]">Cotação Global</h3>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-2">Escolha sempre o melhor preço para sua entrega, conectado a mais de 30 operadoras logísticas.</p>
                    </div>
                </div>

                <div className="flex flex-col items-center text-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-[hsl(var(--ui-accent-purple)/0.1)] flex items-center justify-center text-[hsl(var(--ui-accent-purple))]">
                        <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[hsl(var(--ui-text))]">Atribuição Precisa</h3>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-2">Saiba exatamente qual campanha de tráfego está gerando cotações com UTMs dinâmicas.</p>
                    </div>
                </div>

                <div className="flex flex-col items-center text-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-[hsl(var(--ui-success)/0.1)] flex items-center justify-center text-[hsl(var(--ui-success))]">
                        <Bot className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[hsl(var(--ui-text))]">Automação Rápida</h3>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-2">Respostas padronizadas, regras de fallback, rastreamento direto no celular do cliente.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-6 pb-8">
                <p className="text-sm font-semibold tracking-wide text-[hsl(var(--ui-text-muted))] uppercase">
                    Aprovado pelas melhores operações logísticas
                </p>
                <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 opacity-50 grayscale select-none">
                    {/* Placeholder logos */}
                    <span className="text-xl font-bold font-sans">EmpresaLog®</span>
                    <span className="text-xl font-extrabold italic">FastDrop</span>
                    <span className="text-xl font-mono">VarejoTech.io</span>
                    <span className="text-xl font-bold uppercase tracking-widest">SENDIT</span>
                </div>
            </div>

            <div className="rounded-3xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] p-8 max-w-4xl w-full flex flex-col md:flex-row items-center justify-between shadow-[0_16px_40px_-16px_hsl(var(--ui-shadow)/0.05)]">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-[hsl(var(--ui-text))] font-bold text-lg">Integração Imediata</h4>
                        <p className="text-[hsl(var(--ui-text-muted))] text-sm">Escalável com 99.9% de uptime real</p>
                    </div>
                </div>
                <Link
                    href="/pricing"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-text))] px-6 text-sm font-medium text-[hsl(var(--ui-bg))] transition-colors hover:opacity-90"
                >
                    Criar conta
                </Link>
            </div>

        </div>
    );
}
