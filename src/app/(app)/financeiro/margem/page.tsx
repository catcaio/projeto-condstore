import { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Margem — Financeiro',
    description: 'Análise de margem operacional',
};

export default function FinanceiroMargemPage() {
    return (
        <main className="p-6 md:p-8 max-w-[900px] mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                <div>
                    <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight">Margem</h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Análise de margem por produto, rota e transportadora</p>
                </div>
            </div>
            <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-8 flex flex-col items-center gap-4 text-center">
                <TrendingUp className="w-10 h-10 text-[hsl(var(--ui-text-muted)/0.3)]" />
                <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">Em breve</p>
                <p className="text-xs text-[hsl(var(--ui-text-muted))] max-w-sm">
                    Motor de margem será integrado quando os dados de confirmação do frete estiverem completos.
                </p>
            </div>
        </main>
    );
}
