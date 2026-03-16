import { usePathname, useParams } from 'next/navigation';
import { useMemo } from 'react';

export interface FrankContext {
    module: 'cockpit' | 'conversas' | 'pedidos' | 'logistica' | 'clientes' | 'unknown';
    moduleName: string;
    entityId: string | null;
    readableContext: string;
}

export function useFrankContext(): FrankContext {
    const pathname = usePathname();
    const params = useParams();

    return useMemo(() => {
        const path = pathname || '';
        const id = params?.id ? String(params.id) : null;
        
        // Extract basic module from first path segment
        let module: FrankContext['module'] = 'unknown';
        let moduleName = 'Sistema Geral';
        let readableContext = 'Você está navegando pelo sistema.';

        if (path.startsWith('/cockpit')) {
            module = 'cockpit';
            moduleName = 'Visão Geral (Dashboard)';
            readableContext = 'Você está no Dashboard principal do Cockpit Lojacond. Aqui você tem uma visão geral da operação.';
        } else if (path.startsWith('/conversas')) {
            module = 'conversas';
            moduleName = 'Conversas';
            if (id) {
                readableContext = `Você está visualizando a conversa específica (ID: ${id}).`;
            } else {
                readableContext = 'Você está na fila geral de conversas de atendimento do WhatsApp.';
            }
        } else if (path.startsWith('/pedidos')) {
            module = 'pedidos';
            moduleName = 'Pedidos';
            if (id) {
                readableContext = `Você está visualizando o pedido específico (ID: ${id}).`;
            } else {
                readableContext = 'Você está na lista geral de pedidos da sua operação.';
            }
        } else if (path.startsWith('/logistica')) {
            module = 'logistica';
            moduleName = 'Logística';
            readableContext = 'Você está no painel logístico, visualizando envios e cotações de frete.';
        } else if (path.startsWith('/clientes')) {
            module = 'clientes';
            moduleName = 'Clientes';
            if (id) {
                readableContext = `Você está visualizando o CRM do cliente (ID: ${id}).`;
            } else {
                readableContext = 'Você está no CRM operacional, visualizando a lista de clientes.';
            }
        }

        return {
            module,
            moduleName,
            entityId: id,
            readableContext
        };
    }, [pathname, params]);
}
