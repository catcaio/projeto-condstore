import Link from 'next/link';
import { Bot, Flag, UserPlus } from 'lucide-react';
import { Button } from '@/ui/components';
import type { ConversationRecord } from '../types';

export function ConversationActions({ conversation }: { conversation: ConversationRecord }) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                    console.info('[cockpit] assumir agora click', { conversationId: conversation.id });
                }}
            >
                <UserPlus className="h-4 w-4" />
                Assumir agora
            </Button>
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
        </div>
    );
}
