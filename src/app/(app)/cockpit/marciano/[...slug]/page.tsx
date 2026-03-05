import { SettingsPage } from '@/ui/settings';
import { Construction } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/ui/components/button';

export default async function MarcianoPlaceholderPage(props: { params: Promise<{ slug: string[] }> }) {
    const params = await props.params;
    const moduleName = params.slug.join(' / ');

    return (
        <SettingsPage
            title={`Módulo: ${moduleName}`}
            description="Tela em desenvolvimento para acesso externo."
        >
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 border border-dashed border-[hsl(var(--ui-border))] rounded-2xl bg-[hsl(var(--ui-surface))]">
                <div className="w-16 h-16 rounded-[20px] bg-[hsl(var(--ui-accent-blue)/0.1)] flex items-center justify-center mb-6">
                    <Construction className="w-8 h-8 text-[hsl(var(--ui-accent-blue))]" />
                </div>

                <h2 className="text-xl font-bold text-[hsl(var(--ui-text))] mb-2">
                    Em Construção
                </h2>

                <p className="text-[hsl(var(--ui-text-muted))] max-w-sm mb-8 leading-relaxed">
                    Este módulo reservado ("{moduleName}") será disponibilizado em breve na próxima atualização do OS para inquilinos externos.
                </p>

                <Link href="/cockpit" className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-muted))] h-10 px-4 text-sm font-medium transition-colors">
                    Voltar ao Launcher
                </Link>
            </div>
        </SettingsPage>
    );
}
