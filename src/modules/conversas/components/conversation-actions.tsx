import Link from 'next/link';
import { Bot, Flag, UserPlus } from 'lucide-react';
import { Button } from '@/ui/components';
import type { ConversationRecord } from '../mock-data';

export function ConversationActions({ conversation }: { conversation: ConversationRecord }) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm">
                <UserPlus className="h-4 w-4" />
                Assumir agora
            </Button>
            <Button variant="ghost" size="sm">
                <Bot className="h-4 w-4" />
                Sugerir com IA
            </Button>
            <Button variant="ghost" size="sm">
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
