import { StatusChip } from '@/ui/foundation';
import type { ClientRecord, ClientStatus, CrmStage } from '../types';
import { MessageCircle, CalendarPlus } from 'lucide-react';

function getStatusTone(status: ClientStatus) {
    if (status === 'vip') {
        return 'success' as const;
    }
    if (status === 'em-risco') {
        return 'critical' as const;
    }
    if (status === 'monitorado') {
        return 'warning' as const;
    }
    return 'info' as const;
}

function getPipelineTone(stage?: CrmStage, fallbackStatus?: ClientStatus) {
    if (!stage) return getStatusTone(fallbackStatus!);
    const tones: Record<CrmStage, any> = {
        new_lead: 'info',
        qualified: 'info',
        quoted: 'warning',
        proposal_sent: 'warning',
        negotiating: 'warning',
        won: 'success',
        lost: 'critical'
    };
    return tones[stage] || 'neutral';
}

function getPipelineLabel(stage?: CrmStage, fallbackStatus?: ClientStatus) {
    if (!stage) return fallbackStatus as string;
    const labels: Record<CrmStage, string> = {
        new_lead: 'Novo Lead',
        qualified: 'Qualificado',
        quoted: 'Cotado',
        proposal_sent: 'Proposta Enviada',
        negotiating: 'Em Negociação',
        won: 'Ganho',
        lost: 'Perdido'
    };
    return labels[stage] || stage;
}

export function ClientItem({
    client,
    selected,
    onSelect,
    isSelected,
    onSelectChange
}: {
    client: ClientRecord;
    selected: boolean;
    onSelect: () => void;
    isSelected?: boolean;
    onSelectChange?: (checked: boolean) => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`group relative w-full rounded-[1.25rem] border p-4 text-left transition-colors ${selected ? 'border-[hsl(var(--ui-accent-blue)/0.24)] bg-[hsl(var(--ui-accent-blue)/0.08)]' : 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] hover:border-[hsl(var(--ui-border-strong))] hover:bg-[hsl(var(--ui-surface))]'}`}
        >
            <div className="flex items-start justify-between gap-3 relative">
                {onSelectChange && (
                    <div className="absolute right-0 top-0 z-10" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onSelectChange(e.target.checked)}
                            className="h-4 w-4 rounded border-[hsl(var(--ui-border))] bg-transparent accent-[hsl(var(--ui-primary))] focus:ring-2 focus:ring-[hsl(var(--ui-primary))/50] focus:ring-offset-0 cursor-pointer"
                            aria-label="Selecionar cliente"
                        />
                    </div>
                )}
                <div className={onSelectChange ? "min-w-0 pr-6 w-full" : "min-w-0"}>
                    <div className="flex justify-between items-start w-full relative">
                        <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[hsl(var(--ui-text))]">{client.company}</p>
                            <div className="hidden group-hover:flex gap-1 z-20 bg-[hsl(var(--ui-page))] shadow-sm rounded-md border border-[hsl(var(--ui-border))] p-0.5" onClick={e => e.stopPropagation()}>
                                <button title="WhatsApp Ágil" className="flex h-6 w-6 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-950/30 transition-colors" onClick={() => window.open(`https://wa.me/5511999999999?text=Olar,%20${client.contact}`, '_blank')}>
                                    <MessageCircle className="h-3.5 w-3.5" />
                                </button>
                                <button title="Agendar Follow-up" className="flex h-6 w-6 items-center justify-center rounded text-blue-600 hover:bg-blue-50 dark:text-blue-500 dark:hover:bg-blue-950/30 transition-colors" onClick={() => console.warn('[TODO] Novo Evento not wired')}>
                                    <CalendarPlus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                        <StatusChip 
                            label={getPipelineLabel(client.opportunity?.stage, client.status)} 
                            tone={getPipelineTone(client.opportunity?.stage, client.status)} 
                        />
                    </div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                        {client.opportunity && Number(client.opportunity.amount) > 0 
                            ? `Pipeline: R$ ${client.opportunity.amount}` 
                            : client.segment}
                    </p>
                </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{client.name}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[0.9rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-2 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">Pedidos</p>
                    <p className="mt-1 text-sm font-semibold text-[hsl(var(--ui-text))]">{client.orderCount}</p>
                </div>
                <div className="rounded-[0.9rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-2 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">Conversas</p>
                    <p className="mt-1 text-sm font-semibold text-[hsl(var(--ui-text))]">{client.conversationCount}</p>
                </div>
                <div className="rounded-[0.9rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-2 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">Fretes</p>
                    <p className="mt-1 text-sm font-semibold text-[hsl(var(--ui-text))]">{client.simulationCount}</p>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                <span>{client.lastActivity}</span>
                <span>{client.city}</span>
            </div>
        </button>
    );
}
