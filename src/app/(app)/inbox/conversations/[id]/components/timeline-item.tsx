import { SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { MessageSquare, Webhook, Zap, Activity, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type TimelineEvent } from '../queries';

function getIconForKind(kind: string) {
    switch (kind) {
        case 'message': return <MessageSquare className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />;
        case 'webhook': return <Webhook className="h-5 w-5 text-[hsl(var(--ui-border-strong))]" />;
        case 'freight': return <Zap className="h-5 w-5 text-[hsl(var(--ui-success))]" />;
        case 'funnel': return <ShieldCheck className="h-5 w-5 text-[hsl(var(--ui-warning))]" />;
        case 'public_event': return <Activity className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />;
        default: return <Activity className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />;
    }
}

function getBadgeVariant(status?: string) {
    if (!status) return 'muted';
    const s = status.toLowerCase();
    if (s === 'inbound' || s.includes('received') || s === 'success') return 'success';
    if (s === 'outbound' || s.includes('sent') || s === 'quote_sent') return 'default';
    if (s === 'abandoned' || s === 'failed' || s === 'error') return 'danger';
    if (s === 'intent_detected' || s === 'flow_started') return 'outline';
    return 'muted';
}

export function TimelineItemRow({ item }: { item: TimelineEvent }) {
    const displayTime = format(new Date(item.createdAt), 'HH:mm:ss');
    const displayDate = format(new Date(item.createdAt), 'dd MMM', { locale: ptBR });

    return (
        <SettingsRow
            icon={getIconForKind(item.kind)}
            label={
                <span className="flex items-center gap-2">
                    <span className="font-semibold text-[14px]">{item.title}</span>
                    {item.status && (
                        <Badge variant={getBadgeVariant(item.status)}>{item.status.toUpperCase()}</Badge>
                    )}
                </span>
            }
            description={
                <div className="flex flex-col gap-1 mt-1 text-[13px] text-[hsl(var(--ui-text-subtle))]">
                    {item.body && <span className="text-[hsl(var(--ui-text-muted))]">{item.body}</span>}
                    {item.meta && Object.keys(item.meta).length > 0 && (
                        <pre className="text-[9px] font-mono leading-relaxed bg-[hsl(var(--ui-muted)/0.5)] p-1.5 rounded overflow-x-auto word-break-all max-w-full">
                            {JSON.stringify(item.meta)}
                        </pre>
                    )}
                </div>
            }
            value={
                <div className="flex flex-col items-end gap-0.5 whitespace-nowrap text-right">
                    <span className="text-xs font-semibold text-[hsl(var(--ui-text))]">{displayTime}</span>
                    <span className="text-[10px] text-[hsl(var(--ui-text-muted))]">{displayDate}</span>
                </div>
            }
        />
    );
}
