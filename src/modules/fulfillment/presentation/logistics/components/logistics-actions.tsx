import Link from 'next/link';
import { AlertTriangle, ArrowLeftRight, CheckCheck, MessageSquare, Truck } from 'lucide-react';
import { Button } from '@/ui/components';
import { SectionHeader, SurfacePanel } from '@/ui/foundation';
import type { LogisticsRecord } from '../mock-data';

export function LogisticsActions({ item }: { item: LogisticsRecord }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Acoes rapidas"
                description="Atalhos para responder a operacao logistica com velocidade."
            />
            <div className="mt-4 grid gap-3">
                <Link href={`/conversas?cliente=${item.order.customer.id}&logistica=${item.id}`}>
                    <Button className="w-full justify-start">
                        <MessageSquare className="h-4 w-4" />
                        Abrir conversa
                    </Button>
                </Link>
                <Link href={`/logistica/simulador?pedido=${item.order.id}`}>
                    <Button variant="secondary" className="w-full justify-start">
                        <Truck className="h-4 w-4" />
                        Criar nova simulacao
                    </Button>
                </Link>
                <Button variant="secondary" className="w-full justify-start">
                    <ArrowLeftRight className="h-4 w-4" />
                    Trocar transportadora
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4" />
                    Marcar excecao
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                    <CheckCheck className="h-4 w-4" />
                    Aprovar opcao
                </Button>
                <Link href={`/pedidos?pedido=${item.order.id}`}>
                    <Button variant="ghost" className="w-full justify-start">Ir para pedido</Button>
                </Link>
            </div>
        </SurfacePanel>
    );
}
