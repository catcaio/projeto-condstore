import { SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { MessageSquare, Webhook, Zap, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type InboxItem } from '../queries';

function getIconForKind(kind: string) {
    switch (kind) {
        case 'message': return <MessageSquare className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />;
        case 'webhook': return <Webhook className="h-5 w-5 text-[hsl(var(--ui-border-strong))]" />;
        case 'freight': return <Zap className="h-5 w-5 text-[hsl(var(--ui-success))]" />;
        case 'event': return <Activity className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />;
        default: return <Activity className="h-5 w-5" />;
    }
}

function getBadgeVariant(status?: string) {
    if (!status) return 'muted';
    const s = status.toLowerCase();
    if (s === 'inbound' || s.includes('received') || s === 'success') return 'success';
    if (s === 'outbound' || s.includes('sent') || s === 'quote_sent') return 'default'; // blue
    if (s === 'abandoned' || s === 'failed' || s === 'error') return 'danger';
    return 'muted';
}

export function InboxItemRow({ item }: { item: InboxItem }) {
    const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR });

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
                <div className="flex flex-col gap-0.5 text-xs">
                    {item.subtitle && <span>{item.subtitle}</span>}
                    {item.rawRef && <span className="font-mono text-[10px] text-[hsl(var(--ui-text-subtle))]">{item.rawRef}</span>}
                </div>
            }
            value={<span className="text-xs text-[hsl(var(--ui-text-muted))] whitespace-nowrap">{timeAgo}</span>}
        />
    );
}
