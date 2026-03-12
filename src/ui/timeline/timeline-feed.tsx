'use client';

import React, { useState, useEffect } from 'react';
import { TimelineEvent, TimelineEntity } from '@/modules/timeline/timeline.types';
import { TimelineItem } from './timeline-item';
import { Button } from '@/ui/components/button';
import { RefreshCw, Filter } from 'lucide-react';
import { Card, CardContent } from '@/ui/components/card';

export function TimelineFeed({ 
    entity, 
    entityId,
    title = 'Feed de Atividades',
    refreshIntervalMs = 0 // if 0, disables polling
}: { 
    entity?: TimelineEntity, 
    entityId?: string,
    title?: string,
    refreshIntervalMs?: number
}) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | undefined>();
    const [filterEntity, setFilterEntity] = useState<TimelineEntity | ''>(entity || '');

    const fetchFeed = async (cursor?: string, overwrite = false) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterEntity) params.append('entity', filterEntity);
            if (entityId) params.append('entityId', entityId);
            if (cursor) params.append('cursor', cursor);

            const res = await fetch(`/api/cockpit/timeline?${params.toString()}`);
            if (res.ok) {
                const { data } = await res.json();
                if (overwrite) {
                    setEvents(data.events || []);
                } else {
                    setEvents(prev => [...prev, ...(data.events || [])]);
                }
                setNextCursor(data.nextCursor);
            }
        } catch (err) {
            console.error('Failed to fetch timeline', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed(undefined, true);
    }, [filterEntity, entityId]);

    useEffect(() => {
        if (refreshIntervalMs > 0) {
            const t = setInterval(() => {
                // Polling just fetches the newest payload without overwriting older history implicitly
                // For simplicity, we just reset the feed to page 1
                fetchFeed(undefined, true);
            }, refreshIntervalMs);
            return () => clearInterval(t);
        }
    }, [refreshIntervalMs, filterEntity, entityId]);

    return (
        <Card className="flex flex-col h-full border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] flex justify-between items-center sm:flex-row flex-col gap-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" />
                    {title}
                </h3>
                
                <div className="flex items-center gap-2">
                    {!entity && (
                        <select 
                            value={filterEntity}
                            onChange={(e) => setFilterEntity(e.target.value as any)}
                            className="bg-[hsl(var(--ui-bg-subtle))] border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))] text-xs rounded-md px-2 py-1 focus:ring-1 focus:outline-none"
                        >
                            <option value="">Todas Entidades</option>
                            <option value="conversation">CRM & Atendimento</option>
                            <option value="order">Pedidos</option>
                            <option value="shipment">Logística</option>
                            <option value="system">Sistema</option>
                        </select>
                    )}
                    <button onClick={() => fetchFeed(undefined, true)} className="p-1.5 hover:bg-[hsl(var(--ui-bg-hover))] rounded-md transition-colors border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))]" title="Atualizar">
                        <RefreshCw className={`w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))] ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-1">
                {events.length === 0 && !loading ? (
                    <div className="text-center p-8 text-sm text-[hsl(var(--ui-text-muted))] border border-dashed rounded-lg border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))]">
                        Nenhuma atividade registrada
                    </div>
                ) : (
                    <div className="relative border-l border-[hsl(var(--ui-border))] ml-2 pb-4">
                        {events.map((e, idx) => (
                            <TimelineItem 
                                key={`${e.id}-${idx}`} 
                                event={e} 
                                showEntityTag={!entity && !filterEntity} 
                            />
                        ))}
                    </div>
                )}
                
                {loading && <div className="text-center text-xs text-[hsl(var(--ui-text-muted))] py-4">Carregando feed...</div>}
                
                {nextCursor && !loading && (
                    <div className="pt-2 pb-4 text-center">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => fetchFeed(nextCursor, false)}
                            className="text-xs"
                        >
                            Carregar Mais Antigos
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Just an internal Activity icon for header fallback since it's not exported globally
function Activity(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
}
