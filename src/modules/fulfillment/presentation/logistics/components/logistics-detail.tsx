import { EventList, SectionHeader, SurfacePanel } from '@/ui/foundation';
import { FreightSimulations } from './freight-simulations';
import { LogisticsExceptions } from './logistics-exceptions';
import { LogisticsStatusTimeline } from './logistics-status-timeline';
import { LogisticsSummary } from './logistics-summary';
import type { LogisticsRecord } from '../mock-data';

export function LogisticsDetail({ item }: { item: LogisticsRecord }) {
    return (
        <div className="flex min-h-[42rem] flex-col gap-6">
            <SurfacePanel>
                <SectionHeader
                    title="Detalhe logistico"
                    description="Resumo do fluxo, timeline, simulacoes, historico e excecoes do registro logistico."
                />
                <div className="mt-4">
                    <LogisticsSummary item={item} />
                </div>
            </SurfacePanel>

            <SurfacePanel>
                <SectionHeader title="Timeline de status" description="Checkpoint logistico desde simulacao ate entrega ou excecao." />
                <div className="mt-4">
                    <LogisticsStatusTimeline items={item.timeline} />
                </div>
            </SurfacePanel>

            <FreightSimulations items={item.simulations} />

            <SurfacePanel>
                <SectionHeader title="Historico operacional" description="Eventos, observacoes e alteracoes de status ou transportadora." />
                <div className="mt-4">
                    <EventList
                        items={item.events.map((eventItem) => ({
                            title: eventItem.title,
                            time: eventItem.time,
                            detail: eventItem.detail,
                            tone: eventItem.tone,
                            entity: item.id,
                        }))}
                    />
                </div>
            </SurfacePanel>

            <LogisticsExceptions items={item.exceptions} />
        </div>
    );
}
