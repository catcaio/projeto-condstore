import { SectionHeader, SurfacePanel, StatusChip } from '@/ui/foundation';
import { Button } from '@/ui/components';
import { ConversationActions } from './conversation-actions';
import { ConversationHeader } from './conversation-header';
import { MessageBubble } from './message-bubble';
import type { ConversationRecord } from '../types';

export function ConversationThread({
    conversation,
    draft,
    threadLoading,
    sendingReply,
    onDraftChange,
    onReply,
}: {
    conversation: ConversationRecord;
    draft: string;
    threadLoading: boolean;
    sendingReply: boolean;
    onDraftChange: (value: string) => void;
    onReply: () => Promise<void>;
}) {
    const isReplyDisabled = draft.trim().length === 0 || sendingReply;

    return (
        <SurfacePanel className="flex h-full min-h-[42rem] flex-col">
            <SectionHeader
                title="Thread da conversa"
                description="Historico ativo, assistencia de IA e resposta operacional no mesmo contexto."
                actions={<StatusChip label={`espera ${conversation.waitingSince}`} tone="warning" />}
            />

            <div className="mt-4">
                <ConversationHeader conversation={conversation} />
            </div>

            <div className="mt-4">
                <ConversationActions conversation={conversation} />
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                {threadLoading ? (
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Carregando mensagens...</p>
                ) : conversation.messages.length === 0 ? (
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhuma mensagem na thread.</p>
                ) : (
                    conversation.messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))
                )}
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                        Composer operacional
                    </p>
                    <StatusChip label="macro + IA + envio" tone="info" />
                </div>
                <textarea
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    placeholder="Responder com contexto operacional, prazo revisado e proxima acao explicita..."
                    className="mt-3 min-h-28 w-full resize-none rounded-[1.1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-4 py-3 text-sm leading-6 text-[hsl(var(--ui-text))] outline-none placeholder:text-[hsl(var(--ui-text-subtle))]"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                        Estrutura preparada para anexos, macro aprovada, sugestao de IA e envio multicanal.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm">Salvar rascunho</Button>
                        <Button size="sm" onClick={() => void onReply()} disabled={isReplyDisabled}>
                            {sendingReply ? 'Enviando...' : 'Responder'}
                        </Button>
                    </div>
                </div>
            </div>
        </SurfacePanel>
    );
}
