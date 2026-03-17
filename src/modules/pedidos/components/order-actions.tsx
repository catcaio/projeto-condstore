import Link from 'next/link';
import { AlertTriangle, CheckCheck, MessageSquare, Truck } from 'lucide-react';
import { Button } from '@/ui/components';
import { SectionHeader, SurfacePanel } from '@/ui/foundation';
import type { OrderRecord } from '../types';

export function OrderActions({ order }: { order: OrderRecord }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Acoes rapidas"
                description="Atalhos para resolver o pedido sem perder o contexto operacional."
            />
            <div className="mt-4 grid gap-3">
                <Button className="w-full justify-start">
                    <CheckCheck className="h-4 w-4" />
                    Aprovar pedido
                </Button>
                <Link href={`/conversas?cliente=${order.customer.id}`}>
                    <Button variant="secondary" className="w-full justify-start">
                        <MessageSquare className="h-4 w-4" />
                        Abrir conversa
                    </Button>
                </Link>
                <Link href={`/logistica/simulador?pedido=${order.id}`}>
                    <Button variant="secondary" className="w-full justify-start">
                        <Truck className="h-4 w-4" />
                        Criar simulacao
                    </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4" />
                    Marcar excecao
                </Button>
                <Link href={`/logistica?pedido=${order.id}`}>
                    <Button variant="ghost" className="w-full justify-start">Ir para logistica</Button>
                </Link>
            </div>
        </SurfacePanel>
    );
}
