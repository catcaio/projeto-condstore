import { SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { MessageSquare, Webhook, Zap, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { type InboxConversation } from '../queries';

function getIconForKind(kind: string) {
    switch (kind) {
        case 'message': return <MessageSquare className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />;
        case 'webhook': return <Webhook className="h-5 w-5 text-[hsl(var(--ui-border-strong))]" />;
        case 'freight': return <Zap className="h-5 w-5 text-[hsl(var(--ui-success))]" />;
        case 'event': return <Activity className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />;
        default: return <Activity className="h-5 w-5" />;
    }
}

function getStatusBadge(status: string) {
    if (status === 'open') return <Badge variant="success">OPEN</Badge>;
    if (status === 'pending') return <Badge variant="outline">PENDING</Badge>;
    return <Badge variant="muted">CLOSED</Badge>;
}

export function ConversationRow({ item, searchParamsStr }: { item: InboxConversation, searchParamsStr?: string }) {
    const timeAgo = formatDistanceToNow(new Date(item.lastActivityAt), { addSuffix: true, locale: ptBR });

    // SLA only if open and slaMinutes is defined
    const hasSLA = item.status === 'open' && item.slaMinutes !== undefined;

    return (
        <SettingsRow
            icon={getIconForKind(item.lastKind)}
            label={
                <span className="flex items-center gap-2">
                    <span className="font-semibold text-[14px]">{item.title}</span>
                    {getStatusBadge(item.status)}
                </span>
            }
            description={
                <div className="flex flex-col gap-0.5 mt-1 text-xs text-[hsl(var(--ui-text-muted))]">
                    <span>{hasSLA ? `Aguardando há ${item.slaMinutes} min` : 'Sem pendências'}</span>
                    {item.utmSource && <span>utm_source: {item.utmSource}</span>}
                </div>
            }
            value={
                <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-[hsl(var(--ui-text-muted))] whitespace-nowrap">{timeAgo}</span>
                    <Link href={`/inbox/conversations/${encodeURIComponent(item.convoId)}${searchParamsStr ? `?${searchParamsStr}` : ''}`}>
                        <span className="text-xs font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline cursor-pointer">
                            Ver Thread
                        </span>
                    </Link>
                </div>
            }
        />
    );
}
