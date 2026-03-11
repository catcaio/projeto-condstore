import { StatusChip } from '@/ui/foundation';
import type { ConversationMessage } from '../mock-data';

function getBubbleClasses(actor: ConversationMessage['actor']) {
    if (actor === 'humano') {
        return 'ml-auto border-[hsl(var(--ui-accent-blue)/0.24)] bg-[hsl(var(--ui-accent-blue)/0.08)]';
    }
    if (actor === 'ia') {
        return 'border-[hsl(var(--ui-accent-blue)/0.16)] bg-[hsl(var(--ui-page))]';
    }
    return 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]';
}

function getTone(actor: ConversationMessage['actor']) {
    if (actor === 'humano') {
        return 'info' as const;
    }
    if (actor === 'ia') {
        return 'success' as const;
    }
    return 'neutral' as const;
}

export function MessageBubble({ message }: { message: ConversationMessage }) {
    return (
        <div className={`flex ${message.actor === 'humano' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[44rem] rounded-[1.25rem] border px-4 py-3 ${getBubbleClasses(message.actor)}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                            {message.author}
                        </p>
                        <StatusChip label={message.actor} tone={getTone(message.actor)} />
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                            {message.timestamp}
                        </p>
                        {message.delivery ? <StatusChip label={message.delivery} tone="neutral" /> : null}
                    </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[hsl(var(--ui-text))]">{message.body}</p>
            </div>
        </div>
    );
}
