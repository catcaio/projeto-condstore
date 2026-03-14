import Link from 'next/link';
import { Bot, Flag, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { Button } from '@/ui/components';
import type { ConversationRecord } from '../types';
import { useState } from 'react';

export function ConversationActions({ conversation, onActionComplete }: { conversation: ConversationRecord, onActionComplete?: () => void }) {
    const [loading, setLoading] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

    const handleAssign = async () => {
        setLoading('assign');
        setFeedback(null);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversation.id}/assign`, { method: 'PUT' });
            if (!res.ok) throw new Error('Falha ao assumir.');
            setFeedback({ tone: 'success', message: 'Conversa assumida.' });
            onActionComplete?.();
        } catch (err: any) {
            setFeedback({ tone: 'error', message: err.message });
        } finally {
            setLoading(null);
        }
    };

    const handleRelease = async () => {
        setLoading('release');
        setFeedback(null);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversation.id}/release`, { method: 'PUT' });
            if (!res.ok) throw new Error('Falha ao liberar.');
            setFeedback({ tone: 'success', message: 'Conversa liberada.' });
            onActionComplete?.();
        } catch (err: any) {
            setFeedback({ tone: 'error', message: err.message });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button
                variant="secondary"
                size="sm"
<<<<<<< HEAD
                onClick={() => {
                    console.info('[cockpit] assumir agora click', { conversationId: conversation.id });
                }}
            >
                <UserPlus className="h-4 w-4" />
                Assumir agora
            </Button>
=======
                onClick={handleAssign}
                disabled={!!loading}
            >
                {loading === 'assign' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Assumir agora
            </Button>
            
            <Button
                variant="ghost"
                size="sm"
                onClick={handleRelease}
                disabled={!!loading}
            >
                {loading === 'release' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                Liberar p/ IA
            </Button>

>>>>>>> ff1f966 (feat(whatsapp): implement operational queue, ai routing governance, status webhooks, and UI actions)
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    console.info('[cockpit] sugerir com ia click', { conversationId: conversation.id });
                }}
            >
                <Bot className="h-4 w-4" />
                Sugerir com IA
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    console.info('[cockpit] escalar click', { conversationId: conversation.id });
                }}
            >
                <Flag className="h-4 w-4" />
                Escalar
            </Button>
            <Link href={`/clientes?cliente=${conversation.relatedClientId}`}>
                <Button variant="secondary" size="sm">Abrir cliente</Button>
            </Link>
            <Link href={`/pedidos?pedido=${conversation.relatedOrderId}`}>
                <Button size="sm">Pedido {conversation.relatedOrderId}</Button>
            </Link>
            {feedback ? (
                <span
                    className={feedback.tone === 'success'
                        ? 'text-xs text-[hsl(var(--ui-success))]'
                        : 'text-xs text-[hsl(var(--ui-danger))]'}
                >
                    {feedback.message}
                </span>
            ) : null}
        </div>
    );
}
