import { EmptyState, EventList, SectionHeader, SurfacePanel } from '@/ui/foundation';
import type { CockpitEvent } from '../data/shared';
import { cockpitEvents } from '../mock-data';

export function OperationalEventFeed({ events = cockpitEvents }: { events?: CockpitEvent[] }) {
    return (
        <SurfacePanel className="h-full">
            <SectionHeader
                title="Feed operacional"
                description="Eventos recentes que ajudam o operador a entender o estado atual em poucos segundos."
            />
            <div className="mt-4">
                {events.length === 0 ? (
                    <EmptyState
                        title="Sem eventos recentes"
                        description="Ainda nao ha atividade suficiente nas fontes operacionais conectadas."
                    />
                ) : (
                    <EventList
                        items={events.map((eventItem) => ({
                            title: eventItem.title,
                            time: eventItem.timestamp,
                            detail: eventItem.description,
                            tone: eventItem.tone,
                            type: eventItem.type,
                            entity: eventItem.entity,
                            href: eventItem.href,
                        }))}
                    />
                )}
            </div>
        </SurfacePanel>
    );
}
