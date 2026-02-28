import { SettingsSection } from '@/ui/settings';
import { Target } from 'lucide-react';

export function AttributionEmptyState() {
    return (
        <SettingsSection title="Attribution Data">
            <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
                <Target className="h-10 w-10 text-[hsl(var(--ui-text-muted))]" />
                <div className="text-[15px] font-semibold text-[hsl(var(--ui-text))]">
                    Nenhum dado encontrado
                </div>
                <div className="text-sm text-[hsl(var(--ui-text-muted))] max-w-[280px]">
                    Não há sessões, cliques ou métricas de funil neste período para o agrupamento selecionado.
                </div>
            </div>
        </SettingsSection>
    );
}
