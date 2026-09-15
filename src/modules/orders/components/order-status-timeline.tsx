import type { OrderTimelineStep } from '../types';

function getDotClasses(state: OrderTimelineStep['state']) {
    if (state === 'issue') {
        return 'border-[hsl(var(--ui-danger))] bg-[hsl(var(--ui-danger))]';
    }
    if (state === 'current') {
        return 'border-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-accent-blue))]';
    }
    if (state === 'completed') {
        return 'border-[hsl(var(--ui-success))] bg-[hsl(var(--ui-success))]';
    }
    return 'border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-page))]';
}

export function OrderStatusTimeline({ items }: { items: OrderTimelineStep[] }) {
    return (
        <div className="space-y-0">
            {items.map((item, index) => (
                <div key={item.label} className="flex gap-4">
                    <div className="flex w-6 shrink-0 flex-col items-center">
                        <div className={`mt-1 h-3 w-3 rounded-full border-2 ${getDotClasses(item.state)}`} />
                        {index < items.length - 1 ? (
                            <div className="mt-2 h-full min-h-8 w-px bg-[hsl(var(--ui-border))]" />
                        ) : null}
                    </div>
                    <div className="pb-5">
                        <p className="text-sm font-semibold capitalize text-[hsl(var(--ui-text))]">{item.label.replace('-', ' ')}</p>
                        <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">
                            {item.state === 'completed'
                                ? 'Etapa concluida com rastreabilidade.'
                                : item.state === 'current'
                                  ? 'Etapa atual do fluxo operacional.'
                                  : item.state === 'issue'
                                    ? 'Excecao aberta e aguardando acao manual.'
                                    : 'Etapa ainda nao iniciada.'}
                        </p>
                        {item.timestamp ? (
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                                {item.timestamp}
                            </p>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );
}
