import Link from 'next/link';
import { Check } from 'lucide-react';

export const metadata = {
    title: 'Preços',
    description: 'Planos unificados para escalar sua operação sem surpresas.',
};

export default function PricingPage() {
    return (
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-32 flex flex-col items-center">

            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] mb-4">
                    Planos simples e flexíveis
                </h1>
                <p className="text-lg text-[hsl(var(--ui-text-muted))] max-w-2xl mx-auto">
                    Escalamos com você de um volume de iniciação a centenas de cotações simultâneas.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl">

                {/* STARTER */}
                <div className="flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-3xl p-8 hover:shadow-lg transition-shadow">
                    <h2 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Starter</h2>
                    <div className="mt-4 mb-8 flex items-baseline text-5xl font-extrabold text-[hsl(var(--ui-text))]">
                        R$ 0<span className="text-xl font-medium text-[hsl(var(--ui-text-muted))]">/mês</span>
                    </div>
                    <ul className="flex-1 space-y-4 text-sm text-[hsl(var(--ui-text-muted))]">
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-[hsl(var(--ui-success))]" />Até 100 envios p/ mês</li>
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-[hsl(var(--ui-success))]" />Cotação rápida nos Correios</li>
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-[hsl(var(--ui-success))]" />Dashboard Analytics</li>
                    </ul>
                    <Link href="/login" className="mt-8 block w-full rounded-xl bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--primary-foreground))] px-3 py-3 text-center text-sm font-semibold transition-all hover:brightness-105">
                        Começar Grátis
                    </Link>
                </div>

                {/* ESSENCIAL (Recomendado) */}
                <div className="flex flex-col bg-[hsl(var(--ui-surface-elevated))] border-2 border-[hsl(var(--ui-accent-blue))] rounded-3xl p-8 shadow-2xl relative transform lg:scale-105 z-10">
                    <div className="absolute top-0 right-6 transform -translate-y-1/2 rounded-full py-1 px-3 bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))] text-xs font-bold uppercase tracking-wider">
                        Recomendado
                    </div>
                    <h2 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Essencial</h2>
                    <div className="mt-4 mb-8 flex items-baseline text-5xl font-extrabold text-[hsl(var(--ui-text))]">
                        R$ 97<span className="text-xl font-medium text-[hsl(var(--ui-text-muted))]">/mês</span>
                    </div>
                    <ul className="flex-1 space-y-4 text-sm text-[hsl(var(--ui-text-subtle))]">
                        <li className="flex gap-x-3 text-[hsl(var(--ui-text))]"><Check className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />Envios e cotações ilimitadas</li>
                        <li className="flex gap-x-3 text-[hsl(var(--ui-text))]"><Check className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />Rastreio e Webhooks UTM</li>
                        <li className="flex gap-x-3 text-[hsl(var(--ui-text))]"><Check className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />Integração WhatsApp</li>
                    </ul>
                    <Link href="/login" className="mt-8 block w-full rounded-xl bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--primary-foreground))] px-3 py-3 text-center text-sm font-semibold transition-all hover:brightness-105">
                        Plano Essencial
                    </Link>
                </div>

                {/* GROWTH */}
                <div className="flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-3xl p-8 hover:shadow-lg transition-shadow">
                    <h2 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Growth</h2>
                    <div className="mt-4 mb-8 flex items-baseline text-5xl font-extrabold text-[hsl(var(--ui-text))]">
                        R$ 297<span className="text-xl font-medium text-[hsl(var(--ui-text-muted))]">/mês</span>
                    </div>
                    <ul className="flex-1 space-y-4 text-sm text-[hsl(var(--ui-text-muted))]">
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-[hsl(var(--ui-success))]" />Logs e retenção estendidos</li>
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-[hsl(var(--ui-success))]" />RBAC Completo (Manager)</li>
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-[hsl(var(--ui-success))]" />Suporte e SLA Prioritários</li>
                    </ul>
                    <Link href="/login" className="mt-8 block w-full rounded-xl bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--primary-foreground))] px-3 py-3 text-center text-sm font-semibold transition-all hover:brightness-105">
                        Plano Growth
                    </Link>
                </div>

            </div>
        </div>
    );
}
