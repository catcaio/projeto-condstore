import { Metadata } from 'next';
import { ListChecks } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Fila de Eventos — Operação',
    description: 'Fila de processamento de eventos (DOMINE)',
};

export default function OperacaoFilaPage() {
    return (
        <main className="p-6 md:p-8 max-w-[900px] mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <ListChecks className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                <div>
                    <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight">Fila de Eventos</h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Painel de processamento do DOMINE</p>
                </div>
            </div>
            <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-8 flex flex-col items-center gap-4 text-center">
                <ListChecks className="w-10 h-10 text-[hsl(var(--ui-text-muted)/0.3)]" />
                <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">Em breve</p>
                <p className="text-xs text-[hsl(var(--ui-text-muted))] max-w-sm">
                    Use <a href="/cockpit/domine" className="text-[hsl(var(--ui-accent-blue))] hover:underline">/cockpit/domine</a> enquanto isso.
                </p>
            </div>
        </main>
    );
}
