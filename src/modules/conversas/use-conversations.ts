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

import useSWR from 'swr';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro ${res.status}: ${text}`);
    }
    return res.json();
};

export function useConversations() {
    const [selectedConversationId, setSelectedConversationId] = useState<string>('');
    const [sendingReply, setSendingReply] = useState(false);

    const { data: listResponse, error: listError, isLoading: loading, mutate: mutateList } = useSWR(
        '/api/cockpit/conversations',
        fetcher,
        { refreshInterval: 30000, revalidateOnFocus: true, deduupingInterval: 5000 }
    );

    const { data: threadResponse, error: threadError, isValidating: threadLoading, mutate: mutateThread } = useSWR(
        selectedConversationId ? `/api/cockpit/conversations/${selectedConversationId}` : null,
        fetcher,
        { refreshInterval: 10000, revalidateOnFocus: true }
    );

    const conversations = useMemo(() => {
        if (!listResponse?.data) return [];

        const list = (listResponse.data as DbConversation[]).map((dbConversation) => {
            const mapped = toUiRecord(dbConversation);

            if (dbConversation.id === selectedConversationId && threadResponse?.data?.messages) {
                const messages = threadResponse.data.messages.map(toUiMessage) as ConversationMessage[];
                return {
                    ...mapped,
                    messages,
                    lastMessage: messages.length > 0 ? messages[messages.length - 1].body : mapped.lastMessage,
                };
            }
            return mapped;
        });
        
        return list;
    }, [listResponse, threadResponse, selectedConversationId]);

    const loadConversationThread = useCallback(async (conversationId: string) => {
        setSelectedConversationId(conversationId);
        // SWR will automatically trigger the fetch via the key change
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

        console.info('[cockpit] composer submit', { conversationId: selectedConversationId });

        setSendingReply(true);
        try {
            const response = await fetch(`/api/cockpit/conversations/${selectedConversationId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: trimmed }),
            });

            if (!response.ok) {
                const textResponse = await response.text();
                throw new Error(`Erro ${response.status}: ${textResponse}`);
            }

            // Invalidate the cache for this thread and the list to re-fetch immediately
            await mutateThread();
            await mutateList();

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
    }, [mutateThread, mutateList, selectedConversationId]);

    const error = listError ? (listError instanceof Error ? listError.message : String(listError)) : 
                  threadError ? (threadError instanceof Error ? threadError.message : String(threadError)) : null;

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
        assignConversation: async (id: string) => {
            try {
                const res = await fetch(`/api/cockpit/conversations/${id}/assign`, { method: "PUT" });
                if (!res.ok) throw new Error("Falha ao assumir.");
                await mutateList();
                return { ok: true };
            } catch (err) {
                return { ok: false, error: err instanceof Error ? err.message : "Erro desconhecido" };
            }
        },
        escalateConversation: async (id: string) => {
            console.info("[cockpit] escalar click", { conversationId: id });
            // TODO: Wire to API when available
            return { ok: true };
        },
        refetch: mutateList,
    };
}
