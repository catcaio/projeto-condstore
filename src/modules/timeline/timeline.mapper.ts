import { TimelineEntity, TimelineEvent } from './timeline.types';

export function mapOperationalEventToTimeline(event: any): TimelineEvent | null {
    const payload = event.payload || {};
    
    // Default fallback
    let entity: TimelineEntity = 'system';
    let title = event.eventType;
    let description = '';
    let actor = payload.operatorId || 'Sistema'; // Or from another field
    let entityId = event.entityId || event.customerId || event.id; // fallback entity ID
    
    switch (event.eventType) {
        // Conversation & CRM
        case 'conversation_created':
            entity = 'conversation';
            entityId = payload.conversationId || event.entityId;
            title = 'Conversa Iniciada';
            description = `Nova conversa recebida de ${payload.phone || 'cliente via WhatsApp'}`;
            actor = 'Cliente';
            break;
        case 'conversation_message_received':
            entity = 'conversation';
            entityId = payload.conversationId || event.entityId;
            title = 'Mensagem Recebida';
            description = typeof payload.message === 'string' 
                ? payload.message.substring(0, 100) + (payload.message.length > 100 ? '...' : '')
                : 'Nova mensagem recebida do cliente.';
            actor = 'Cliente';
            break;
        case 'conversation_message_sent':
            entity = 'conversation';
            entityId = payload.conversationId || event.entityId;
            title = 'Mensagem Enviada';
            description = typeof payload.message === 'string'
                ? payload.message.substring(0, 100) + (payload.message.length > 100 ? '...' : '')
                : 'Mensagem enviada.';
            break;
        case 'conversation_stage_changed':
            entity = 'conversation';
            entityId = payload.conversationId || event.entityId;
            title = 'Estágio Alterado (CRM)';
            description = `Movido de ${payload.oldStage || 'N/A'} para ${payload.newStage}`;
            break;

        // Quotes
        case 'quote_simulated':
        case 'freight_quote_simulated':
            entity = 'conversation'; // Linked to conversation context most often
            entityId = payload.conversationId || event.entityId;
            title = 'Cotação Simulada';
            description = `Cotação de frete realizada (Volume: ${payload.volume || 'N/A'})`;
            break;
        case 'quote_sent':
            entity = 'conversation';
            entityId = payload.conversationId || event.entityId;
            title = 'Cotação Enviada';
            description = `Cotação comercial enviada via canal principal (Valor: ${payload.amount || 'N/A'})`;
            break;

        // Orders
        case 'order_created':
            entity = 'order';
            entityId = event.entityId;
            title = 'Pedido Criado';
            description = `Um novo pedido foi gerado${payload.carrier ? ` via ${payload.carrier}` : ''}.`;
            break;
        case 'order_status_changed':
            entity = 'order';
            entityId = event.entityId;
            title = 'Status do Pedido Atualizado';
            description = `Novo status: ${payload.newStatus}`;
            break;

        // Shipments
        case 'shipment_created':
            entity = 'shipment';
            entityId = event.entityId;
            title = 'Logística Iniciada';
            description = `Um rastreio logístico foi iniciado para o transporte via ${payload.carrier || 'Transportadora'}`;
            break;
        case 'shipment_status_updated':
            entity = 'shipment';
            entityId = event.entityId;
            title = 'Status de Envio Atualizado';
            description = `O pacote agora consta como: ${payload.newStatus || payload.status}`;
            break;

        // Configs & Custom Fields
        case 'custom_field_value_set':
            entity = payload.entity as TimelineEntity || 'system';
            entityId = event.entityId;
            title = 'Campo Customizado Atualizado';
            description = `Anotação no campo estendido '${payload.fieldKey}'`;
            break;
        case 'custom_field_created':
        case 'custom_field_updated':
        case 'config_created':
        case 'config_updated':
            entity = 'system';
            title = 'Configuração Alterada';
            description = `Uma regra via painel de controle (Control Plane) foi modificada: ${payload?.fieldKey || event.entityId || 'N/A'}`;
            break;
            
        // Frank
        case 'frank_suggestion_generated':
            entity = 'conversation';
            entityId = payload.conversationId || event.entityId;
            title = 'Frank (AI) gerou sugestão';
            description = 'Assistente supervisionado formulou uma possível resposta de atendimento.';
            actor = 'Frank AI';
            break;
        case 'frank_suggestion_approved':
            entity = 'conversation';
            entityId = payload.conversationId || event.entityId;
            title = 'Sugestão do Frank Aprovada';
            description = 'O operador supervisionou e consentiu a recomendação ativa do assistente.';
            break;
        
        // Return null for uninteresting events
        case 'operational_event_published':
        case 'config_deleted':
            return null; // Skip noisy generic events from UI timeline

        default:
            title = event.eventType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
            description = 'Evento sistêmico genérico emitido no tenant.';
    }

    if (!entityId) {
        entityId = event.id; // absolute fallback
    }

    return {
        id: event.id,
        tenantId: event.tenantId,
        entity,
        entityId,
        eventType: event.eventType,
        title,
        description,
        createdAt: new Date(event.createdAt),
        actor,
        metadata: payload,
    };
}
