import { SettingsSection, SettingsRow } from '@/ui/settings';
import { formatDistanceToNow } from 'date-fns';
import { Zap } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { getRecentActivity } from '../queries';
import { EmptyActivity } from './empty-states';

const stageToColor: Record<string, string> = {
    'INTENT_DETECTED': 'text-[hsl(var(--ui-border-strong))]',
    'ASKED_CEP': 'text-[hsl(var(--ui-text-muted))]',
    'CEP_RECEIVED': 'text-[hsl(var(--ui-accent-blue))]',
    'QUOTE_SENT': 'text-[hsl(var(--ui-success))]',
    'ABANDONED': 'text-[hsl(var(--ui-danger))]',
    // fallback
    'flow_started': 'text-[hsl(var(--ui-border-strong))]',
    'cep_provided': 'text-[hsl(var(--ui-accent-blue))]',
    'freight_quoted': 'text-[hsl(var(--ui-success))]',
};

export async function ActivitySection({ tenantId }: { tenantId: string }) {
    const activity = await getRecentActivity(tenantId);

    if (activity.length === 0) {
        return <EmptyActivity />;
    }

    return (
        <SettingsSection title="Atividade Recente">
            {activity.map((ev, i) => {
                const colorClass = stageToColor[ev.stage] || 'text-[hsl(var(--ui-text))]';

                return (
                    <SettingsRow
                        key={i}
                        icon={<Zap className={`h-5 w-5 ${colorClass}`} />}
                        label={
                            <span className="flex items-center gap-2">
                                <span className="font-semibold">{ev.stage.replace(/_/g, ' ')}</span>
                            </span>
                        }
                        description={ev.phoneNumber ? `Origem: ${ev.phoneNumber}` : `Ref: ${ev.sessionId}`}
                        value={formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true, locale: ptBR })}
                    />
                );
            })}
        </SettingsSection>
    );
}
