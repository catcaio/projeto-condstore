import { SettingsSection } from '@/ui/settings';
import { Inbox } from 'lucide-react';

export function InboxEmptyState() {
    return (
        <SettingsSection title="Timeline Operacional">
            <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
                <Inbox className="h-10 w-10 text-[hsl(var(--ui-text-muted))]" />
                <div className="text-[15px] font-semibold text-[hsl(var(--ui-text))]">
                    Nenhuma atividade encontrada
                </div>
                <div className="text-sm text-[hsl(var(--ui-text-muted))] max-w-[280px]">
                    Não há eventos ou mensagens registrados que coincidam com seus filtros atuais.
                </div>
            </div>
        </SettingsSection>
    );
}
