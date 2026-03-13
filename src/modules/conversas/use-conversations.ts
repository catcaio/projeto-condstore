'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
    ConversationChannel,
    ConversationContextData,
    ConversationMessage,
    ConversationPriority,
    ConversationRecord,
    ConversationStatus,
} from './types';

/* ── DB → UI status mapping ────────────────────────────────────────────────── */

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

/* ── Helpers ────────────────────────────────────────────────────────────────── */

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

/* ── DB record shape (subset returned by the API) ──────────────────────────── */

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

/* ── Transform ──────────────────────────────────────────────────────────────── */

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

/* ── Hook ────────────────────────────────────────────────────────────────────── */

export function useConversations() {
    const [conversations, setConversations] = useState<ConversationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            setConversations(data.map(toUiRecord));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
        // Refresh every 30 seconds
        const interval = setInterval(fetchConversations, 30_000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    return { conversations, loading, error, refetch: fetchConversations };
}
