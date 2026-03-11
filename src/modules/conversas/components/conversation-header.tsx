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

export function ConversationHeader({ conversation }: { conversation: ConversationRecord }) {
    return (
        <div className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                        Conversa ativa
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[hsl(var(--ui-text))]">
                        {conversation.customerName}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">
                        {conversation.customerSegment} • owner atual {conversation.owner} • pedido {conversation.relatedOrderId}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <StatusChip label={conversation.status} tone={getStatusTone(conversation.status)} />
                    <StatusChip label={conversation.priority} tone={getPriorityTone(conversation.priority)} />
                    <StatusChip label={conversation.channel} tone={getChannelTone(conversation.channel)} />
                </div>
            </div>
        </div>
    );
}
