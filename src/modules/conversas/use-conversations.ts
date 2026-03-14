'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
    ConversationChannel,
    ConversationContextData,
    ConversationMessage,
    ConversationPriority,
    ConversationRecord,
    ConversationStatus,
} from './types';

const STATUS_MAP: Record<string, ConversationStatus> = {
    OPEN: 'nova',
    WAITING_CUSTOMER: 'aguardando-cliente',
    WAITING_INTERNAL: 'em-atendimento',
    RESOLVED: 'resolvida',
};

const CHANNEL_MAP: Record<string, ConversationChannel> = {
    WHATSAPP: 'WhatsApp',
    EMAIL: 'Email',
    PORTAL: 'Portal',
};

const SOURCE_LABEL: Record<string, string> = {
    WHATSAPP: 'Cliente',
    OPERATOR: 'Operador',
    SYSTEM: 'Sistema',
};

function relativeTime(isoOrNull: string | null | undefined): string {
    if (!isoOrNull) return '—';
    const diff = Date.now() - new Date(isoOrNull).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

function formatTimestamp(isoOrNull: string | null | undefined): string {
    if (!isoOrNull) return 'Agora';
    const date = new Date(isoOrNull);
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
    }).format(date);
}

const emptyContext: ConversationContextData = {
    customerSummary: '',
    accountHealth: '',
    region: '',
    tags: [],
    detectedIntent: '',
    recentSimulations: [],
    recentOrders: [],
};

const emptyMessages: ConversationMessage[] = [];

interface DbConversation {
    id: string;
    tenantId: string;
    phoneHash: string;
    customerId: string | null;
    organizationId: string | null;
    status: string;
    channel: string;
    assignedTo: string | null;
    lastMessageAt: string | null;
    stage: string | null;
    createdAt: string;
    updatedAt: string | null;
}

interface DbConversationMessage {
    id: string;
    direction: 'INBOUND' | 'OUTBOUND';
    source: 'WHATSAPP' | 'OPERATOR' | 'SYSTEM';
    message: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

interface ConversationDetailsResponse {
    data?: {
        messages?: DbConversationMessage[];
    };
}

function toUiRecord(db: DbConversation): ConversationRecord {
    const status: ConversationStatus = STATUS_MAP[db.status] ?? 'nova';
    const channel: ConversationChannel = CHANNEL_MAP[db.channel] ?? 'WhatsApp';
    const priority: ConversationPriority = status === 'escalada' ? 'critica' : 'media';

    return {
        id: db.id,
        relatedClientId: db.customerId ?? '',
        relatedLogisticsId: '',
        customerName: db.phoneHash ? `Cliente ${db.phoneHash.slice(0, 8)}…` : 'Desconhecido',
        customerSegment: db.organizationId ?? '—',
        owner: db.assignedTo ?? 'Sem responsavel',
        status,
        priority,
        channel,
        lastMessage: '',
        lastMessageAt: relativeTime(db.lastMessageAt),
        waitingSince: relativeTime(db.lastMessageAt),
        unreadCount: status === 'nova' ? 1 : 0,
        relatedOrderId: '',
        relatedSimulationId: '',
        messages: emptyMessages,
        context: emptyContext,
    };
}

function toUiMessage(dbMessage: DbConversationMessage): ConversationMessage {
    const actor = dbMessage.direction === 'OUTBOUND' ? 'humano' : 'cliente';
    const author = SOURCE_LABEL[dbMessage.source] ?? 'Sistema';

    return {
        id: dbMessage.id,
        actor,
        author,
        body: dbMessage.message,
        timestamp: formatTimestamp(dbMessage.createdAt),
        delivery: dbMessage.direction === 'OUTBOUND' ? 'enviado' : undefined,
    };
}

export function useConversations() {
    const [conversations, setConversations] = useState<ConversationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = useState<string>('');
    const [threadLoading, setThreadLoading] = useState(false);
    const [sendingReply, setSendingReply] = useState(false);

    const fetchConversations = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/cockpit/conversations');

            if (!res.ok) {
                const text = await res.text();
                setError(`Erro ${res.status}: ${text}`);
                return;
            }

            const json = await res.json();
            const data: DbConversation[] = json.data ?? [];
            setConversations((current) => {
                const currentById = new Map(current.map((conversation) => [conversation.id, conversation]));
                return data.map((dbConversation) => {
                    const mapped = toUiRecord(dbConversation);
                    const existing = currentById.get(dbConversation.id);
                    return existing ? { ...mapped, messages: existing.messages } : mapped;
                });
            });
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadConversationThread = useCallback(async (conversationId: string) => {
        console.info('[cockpit] selectedConversationId', { conversationId });
        setSelectedConversationId(conversationId);
        try {
            setThreadLoading(true);
            const response = await fetch(`/api/cockpit/conversations/${conversationId}`);
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Erro ${response.status}: ${text}`);
            }

            const details = (await response.json()) as ConversationDetailsResponse;
            const messages = (details.data?.messages ?? []).map(toUiMessage);

            setConversations((current) => current.map((conversation) => (
                conversation.id === conversationId
                    ? {
                        ...conversation,
                        messages,
                        lastMessage: messages[messages.length - 1]?.body ?? conversation.lastMessage,
                    }
                    : conversation
            )));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Falha ao carregar thread';
            console.error('[cockpit] thread load failed', { conversationId, error: err });
            setError(message);
        } finally {
            setThreadLoading(false);
        }
    }, []);

    const selectedConversation = useMemo(
        () => conversations.find((conversation) => conversation.id === selectedConversationId),
        [conversations, selectedConversationId],
    );

    const sendReply = useCallback(async (text: string) => {
        const trimmed = text.trim();

        if (!selectedConversationId || trimmed.length === 0) {
            return { ok: false as const, error: 'Conversa ou mensagem invalida.' };
        }

        console.info('[cockpit] composer submit', {
            conversationId: selectedConversationId,
            textLength: trimmed.length,
        });

        setSendingReply(true);
        try {
            const response = await fetch(`/api/cockpit/conversations/${selectedConversationId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: trimmed }),
            });

            console.info('[cockpit] outbound API call', {
                conversationId: selectedConversationId,
                status: response.status,
            });

            if (!response.ok) {
                const textResponse = await response.text();
                throw new Error(`Erro ${response.status}: ${textResponse}`);
            }

            await loadConversationThread(selectedConversationId);

            console.info('[cockpit] outbound success', { conversationId: selectedConversationId });
            return { ok: true as const };
        } catch (err) {
            console.error('[cockpit] outbound failed', { conversationId: selectedConversationId, error: err });
            return {
                ok: false as const,
                error: err instanceof Error ? err.message : 'Falha ao enviar resposta',
            };
        } finally {
            setSendingReply(false);
        }
    }, [loadConversationThread, selectedConversationId]);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 30_000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    useEffect(() => {
        if (!selectedConversationId) return;

        const interval = setInterval(() => {
            void loadConversationThread(selectedConversationId);
        }, 5_000);

        return () => clearInterval(interval);
    }, [loadConversationThread, selectedConversationId]);

    return {
        conversations,
        loading,
        threadLoading,
        sendingReply,
        selectedConversationId,
        selectedConversation,
        error,
        setSelectedConversationId,
        loadConversationThread,
        sendReply,
        refetch: fetchConversations,
    };
}
