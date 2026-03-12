import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimelineEvent } from '@/modules/timeline/timeline.types';
import { User, MessageSquare, ShoppingCart, Truck, Settings, Box, Activity } from 'lucide-react';

export function TimelineItem({ event, showEntityTag = false }: { event: TimelineEvent, showEntityTag?: boolean }) {
    const getIcon = () => {
        switch (event.entity) {
            case 'conversation': return <MessageSquare className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" />;
            case 'customer': return <User className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" />;
            case 'order': return <ShoppingCart className="w-4 h-4 text-[hsl(var(--ui-success))]" />;
            case 'shipment': return <Truck className="w-4 h-4 text-[hsl(var(--ui-warning))]" />;
            case 'system': return <Settings className="w-4 h-4 text-[hsl(var(--ui-text-muted))]" />;
            default: return <Activity className="w-4 h-4 text-[hsl(var(--ui-text-muted))]" />;
        }
    };

    const getEntityTheme = () => {
        switch (event.entity) {
            case 'conversation': return 'bg-[hsl(var(--ui-bg-subtle))] text-[hsl(var(--ui-accent-blue))] border-[hsl(var(--ui-border))]';
            case 'customer': return 'bg-[hsl(var(--ui-bg-subtle))] text-[hsl(var(--ui-accent-blue))] border-[hsl(var(--ui-border))]';
            case 'order': return 'bg-[hsl(var(--ui-bg-subtle))] text-[hsl(var(--ui-success))] border-[hsl(var(--ui-border))]';
            case 'shipment': return 'bg-[hsl(var(--ui-bg-subtle))] text-[hsl(var(--ui-warning))] border-[hsl(var(--ui-border))]';
            case 'system': return 'bg-[hsl(var(--ui-bg-subtle))] text-[hsl(var(--ui-text-muted))] border-[hsl(var(--ui-border))]';
            default: return 'bg-[hsl(var(--ui-bg-subtle))] text-[hsl(var(--ui-text-muted))] border-[hsl(var(--ui-border))]';
        }
    };

    return (
        <div className="relative pl-8 py-3 group">
            <div className="absolute left-[11px] top-6 bottom-[-18px] w-px bg-[hsl(var(--ui-border))] group-last:hidden" />
            
            <div className="absolute left-0 top-4 w-[24px] h-[24px] rounded-full bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))] flex items-center justify-center z-10 shadow-sm">
                {getIcon()}
            </div>

            <div className="bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))] rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-1 gap-2">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[hsl(var(--ui-text))]">
                            {event.title}
                        </span>
                        {showEntityTag && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${getEntityTheme()}`}>
                                {event.entity}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-[hsl(var(--ui-text-muted))] whitespace-nowrap">
                        {format(new Date(event.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                </div>
                
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mb-2 whitespace-pre-wrap">
                    {event.description}
                </p>
                
                {(event.actor || event.entityId) && (
                    <div className="flex items-center gap-3 text-[10px] text-[hsl(var(--ui-text-muted))] uppercase font-medium mt-2 pt-2 border-t border-[hsl(var(--ui-border-subtle))]">
                        {event.actor && (
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {event.actor}
                            </span>
                        )}
                        {event.entityId && (
                            <span className="flex items-center gap-1 font-mono tracking-wider" title="Entity ID">
                                <Box className="w-3 h-3" /> {event.entityId.slice(0, 8)}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
