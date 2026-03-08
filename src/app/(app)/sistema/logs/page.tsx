import { Metadata } from 'next';
import { ScrollText } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Logs — Sistema',
    description: 'Audit logs do sistema',
};

export default function SistemaLogsPage() {
    return (
        <main className="p-6 md:p-8 max-w-[900px] mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <ScrollText className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                <div>
                    <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight">Logs & Auditoria</h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Histórico de eventos e logs de auditoria do sistema</p>
                </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-8 flex flex-col items-center gap-4 text-center">
                <ScrollText className="w-10 h-10 text-[hsl(var(--ui-text-muted)/0.3)]" />
                <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">Em breve</p>
                <p className="text-xs text-[hsl(var(--ui-text-muted))] max-w-sm">
                    Consolidação dos logs de auditoria será disponibilizada aqui.
                    Use <a href="/cockpit/audit" className="text-[hsl(var(--ui-accent-blue))] hover:underline">/cockpit/audit</a> enquanto isso.
                </p>
            </div>
        </main>
    );
}
