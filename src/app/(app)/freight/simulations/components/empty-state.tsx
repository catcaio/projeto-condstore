import { SettingsSection } from '@/ui/settings';
import { Truck } from 'lucide-react';

export function SimulationsEmptyState() {
    return (
        <SettingsSection title="Simulações">
            <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
                <Truck className="h-10 w-10 text-[hsl(var(--ui-text-muted))]" />
                <div className="text-[15px] font-semibold text-[hsl(var(--ui-text))]">
                    Nenhuma simulação encontrada
                </div>
                <div className="text-sm text-[hsl(var(--ui-text-muted))] max-w-[280px]">
                    Não há logs de simulação de frete neste período que correspondam aos seus filtros.
                </div>
            </div>
        </SettingsSection>
    );
}
