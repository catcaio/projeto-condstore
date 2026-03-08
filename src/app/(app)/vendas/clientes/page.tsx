import { Metadata } from 'next';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Clientes — Vendas',
    description: 'Gestão de clientes',
};

export default function VendasClientesPage() {
    return (
        <main className="p-6 md:p-8 max-w-[900px] mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Users className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                <div>
                    <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight">Clientes</h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Gestão da base de clientes</p>
                </div>
            </div>
            <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-8 flex flex-col items-center gap-4 text-center">
                <Users className="w-10 h-10 text-[hsl(var(--ui-text-muted)/0.3)]" />
                <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">Em breve</p>
                <p className="text-xs text-[hsl(var(--ui-text-muted))] max-w-sm">
                    Central do comprador será integrada aqui.
                </p>
            </div>
        </main>
    );
}
