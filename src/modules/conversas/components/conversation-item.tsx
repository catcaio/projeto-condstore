import { StatusChip } from '@/ui/foundation';
import type { ConversationChannel, ConversationPriority, ConversationRecord, ConversationStatus } from '../mock-data';

function getStatusTone(status: ConversationStatus) {
    if (status === 'escalada') {
        return 'critical' as const;
    }
    if (status === 'nova') {
        return 'warning' as const;
    }
    if (status === 'em-atendimento') {
        return 'info' as const;
    }
    if (status === 'resolvida') {
        return 'success' as const;
    }
    return 'neutral' as const;
}

function getPriorityTone(priority: ConversationPriority) {
    if (priority === 'critica') {
        return 'critical' as const;
    }
    if (priority === 'alta') {
        return 'warning' as const;
    }
    if (priority === 'media') {
        return 'info' as const;
    }
    return 'neutral' as const;
}

function getChannelTone(channel: ConversationChannel) {
    if (channel === 'WhatsApp') {
        return 'success' as const;
    }
    if (channel === 'Portal') {
        return 'info' as const;
    }
    return 'neutral' as const;
}

export function ConversationItem({
    conversation,
    selected,
    onSelect,
}: {
    conversation: ConversationRecord;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full rounded-[1.25rem] border p-4 text-left transition-colors ${selected ? 'border-[hsl(var(--ui-accent-blue)/0.24)] bg-[hsl(var(--ui-accent-blue)/0.08)]' : 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] hover:border-[hsl(var(--ui-border-strong))] hover:bg-[hsl(var(--ui-surface))]'}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[hsl(var(--ui-text))]">{conversation.customerName}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                        {conversation.customerSegment}
                    </p>
                </div>
                <p className="shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                    {conversation.lastMessageAt}
                </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <StatusChip label={conversation.status} tone={getStatusTone(conversation.status)} />
                <StatusChip label={conversation.channel} tone={getChannelTone(conversation.channel)} />
                <StatusChip label={conversation.priority} tone={getPriorityTone(conversation.priority)} />
            </div>

            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{conversation.lastMessage}</p>

            <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                    {conversation.owner}
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                        {conversation.waitingSince}
                    </span>
                    {conversation.unreadCount > 0 ? (
                        <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-2 py-1 text-[11px] font-semibold text-[hsl(var(--ui-text))]">
                            {conversation.unreadCount}
                        </span>
                    ) : null}
                </div>
            </div>
        </button>
    );
}
