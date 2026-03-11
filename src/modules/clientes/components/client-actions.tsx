import Link from 'next/link';
import { MessageSquarePlus, PackagePlus, Plus, Truck } from 'lucide-react';
import { Button } from '@/ui/components';
import { SectionHeader, SurfacePanel } from '@/ui/foundation';
import type { ClientRecord } from '../mock-data';

export function ClientActions({ client }: { client: ClientRecord }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Acoes rapidas"
                description="Acesso direto ao que move o relacionamento e a operacao do cliente."
            />
            <div className="mt-4 grid gap-3">
                <Link href={`/conversas?cliente=${client.id}`}>
                    <Button className="w-full justify-start">
                        <MessageSquarePlus className="h-4 w-4" />
                        Abrir conversa
                    </Button>
                </Link>
                <Link href={client.orders[0] ? `/logistica/simulador?pedido=${client.orders[0].id}` : '/logistica/simulador'}>
                    <Button variant="secondary" className="w-full justify-start">
                        <Truck className="h-4 w-4" />
                        Criar simulacao
                    </Button>
                </Link>
                <Link href={`/pedidos?cliente=${client.id}`}>
                    <Button variant="secondary" className="w-full justify-start">
                        <PackagePlus className="h-4 w-4" />
                        Criar pedido
                    </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start">
                    <Plus className="h-4 w-4" />
                    Adicionar tag
                </Button>
            </div>
        </SurfacePanel>
    );
}
