import { SettingsSection } from '@/ui/settings';
import { Ghost } from 'lucide-react';

export function ConversationEmptyState() {
    return (
        <SettingsSection title="Timeline">
            <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
                <Ghost className="h-10 w-10 text-[hsl(var(--ui-text-muted))]" />
                <div className="text-[15px] font-semibold text-[hsl(var(--ui-text))]">
                    Timeline Vazia
                </div>
                <div className="text-sm text-[hsl(var(--ui-text-muted))] max-w-[280px]">
                    Não foram encontrados eventos correlacionados a este identificador.
                </div>
            </div>
        </SettingsSection>
    );
}
