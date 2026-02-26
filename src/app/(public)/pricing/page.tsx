import Link from 'next/link';
import { Check } from 'lucide-react';

export const metadata = {
    title: 'Preços',
    description: 'Comece a operar seu frete grátis ou traga a sua loja em escala.',
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

                <div className="flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-3xl p-8 hover:shadow-lg transition-shadow">
                    <h2 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Starter</h2>
                    <div className="mt-4 mb-8 flex items-baseline text-5xl font-extrabold text-[hsl(var(--ui-text))]">
                        R$ 0<span className="text-xl font-medium text-[hsl(var(--ui-text-muted))]">/mês</span>
                    </div>
                    <ul className="flex-1 space-y-4 text-sm text-[hsl(var(--ui-text-muted))]">
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-green-500" />Até 100 envios p/ mês</li>
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-green-500" />Cotação rápida nos Correios</li>
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-green-500" />Dashboard Analytics</li>
                    </ul>
                    <Link href="/login" className="mt-8 block w-full rounded-xl border border-[hsl(var(--ui-border))] px-3 py-3 text-center text-sm font-semibold hover:bg-[hsl(var(--ui-muted))]">Começar Grátis</Link>
                </div>

                <div className="flex flex-col bg-[hsl(var(--ui-text))] border border-[hsl(var(--ui-border))] rounded-3xl p-8 shadow-2xl relative transform lg:scale-105 z-10">
                    <div className="absolute top-0 right-6 transform -translate-y-1/2 rounded-full py-1 px-3 bg-[hsl(var(--ui-accent-blue))] text-xs font-semibold text-white uppercase tracking-wider">
                        Mais Popular
                    </div>
                    <h2 className="text-2xl font-bold text-[hsl(var(--ui-bg))]">Pro</h2>
                    <div className="mt-4 mb-8 flex items-baseline text-5xl font-extrabold text-[hsl(var(--ui-bg))]">
                        R$ 149<span className="text-xl font-medium text-[hsl(var(--ui-muted))]">/mês</span>
                    </div>
                    <ul className="flex-1 space-y-4 text-sm text-[hsl(var(--ui-bg))] opacity-90">
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-green-400" />Envios e cotações ilimitadas</li>
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-green-400" />Rastreio e Webhooks UTM</li>
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-green-400" />Integração WhatsApp</li>
                    </ul>
                    <Link href="/login" className="mt-8 block w-full rounded-xl bg-[hsl(var(--ui-bg))] px-3 py-3 text-center text-sm font-semibold text-[hsl(var(--ui-text))] hover:opacity-90">Plano Pro</Link>
                </div>

                <div className="flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-3xl p-8 hover:shadow-lg transition-shadow">
                    <h2 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Enterprise</h2>
                    <div className="mt-4 mb-8 flex items-baseline text-4xl font-extrabold text-[hsl(var(--ui-text))] h-[60px] items-end pb-1">
                        Sob Contrato
                    </div>
                    <ul className="flex-1 space-y-4 text-sm text-[hsl(var(--ui-text-muted))]">
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-green-500" />Logs e retenção estendidos</li>
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-green-500" />RBAC Completo (Manager)</li>
                        <li className="flex gap-x-3"><Check className="h-5 w-5 text-green-500" />Suporte e SLA Prioritários</li>
                    </ul>
                    <Link href="/login" className="mt-8 block w-full rounded-xl border border-[hsl(var(--ui-border))] px-3 py-3 text-center text-sm font-semibold hover:bg-[hsl(var(--ui-muted))]">Falar Contato</Link>
                </div>

            </div>
        </div>
    );
}
