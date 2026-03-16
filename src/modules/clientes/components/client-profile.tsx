import { KPIStrip, ShellContainer } from '@/ui/foundation';
import { ClientConversations } from './client-conversations';
import { ClientOrders } from './client-orders';
import { ClientSimulations } from './client-simulations';
import { ClientSummary } from './client-summary';
import type { ClientRecord } from '../mock-data';

export function ClientProfile({ client }: { client: ClientRecord | undefined }) {
    if (!client) {
        return (
            <ShellContainer>
                <div className="flex h-48 items-center justify-center text-sm text-[hsl(var(--ui-text-muted))]">
                    Perfil de cliente não encontrado ou não associado.
                </div>
            </ShellContainer>
        );
    }

    return (
        <ShellContainer>
            <ClientSummary client={client} />
            <KPIStrip
                items={[
                    { label: 'Total pedidos', value: String(client.orderCount), helper: 'Pedidos recentes visiveis no relacionamento operacional.', tone: 'info' },
                    { label: 'Total simulacoes', value: String(client.simulationCount), helper: 'Cotacoes acionadas para manter prazo, margem e contingencia.', tone: 'success' },
                    { label: 'Ticket medio', value: client.averageTicket, helper: 'Leitura rapida do peso economico medio da conta.', tone: 'neutral' },
                    { label: 'Ultima interacao', value: client.lastInteraction, helper: 'Janela operacional do ultimo contato relevante.', tone: 'warning' },
                ]}
            />
            <ClientConversations clientId={client.id} items={client.conversations} />
            <ClientOrders clientId={client.id} items={client.orders} />
            <ClientSimulations clientId={client.id} items={client.simulations} />
        </ShellContainer>
    );
}
