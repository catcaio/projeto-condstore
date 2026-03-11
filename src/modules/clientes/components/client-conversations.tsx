import Link from 'next/link';
import { Button } from '@/ui/components';
import { SectionHeader, StatusChip, SurfacePanel } from '@/ui/foundation';
import type { ClientConversationActivity, ClientConversationStatus } from '../mock-data';

function getStatusTone(status: ClientConversationStatus) {
    if (status === 'escalada') {
        return 'critical' as const;
    }
    if (status === 'em-atendimento') {
        return 'info' as const;
    }
    if (status === 'resolvida') {
        return 'success' as const;
    }
    return 'warning' as const;
}

export function ClientConversations({
    clientId,
    items,
    title = 'Ultimas conversas',
    description = 'Threads recentes e ownership atual do relacionamento.',
    compact = false,
}: {
    clientId: string;
    items: ClientConversationActivity[];
    title?: string;
    description?: string;
    compact?: boolean;
}) {
    return (
        <SurfacePanel>
            <SectionHeader
                title={title}
                description={description}
                actions={
                    <Link href={`/conversas?cliente=${clientId}`}>
                        <Button variant="secondary" size="sm">Abrir em conversas</Button>
                    </Link>
                }
            />
            <div className="mt-4 space-y-3">
                {items.slice(0, compact ? 2 : 3).map((item) => (
                    <div key={item.id} className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{item.title}</p>
                                <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">{item.channel} • {item.owner}</p>
                            </div>
                            <StatusChip label={item.status} tone={getStatusTone(item.status)} />
                        </div>
                        <p className="mt-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                            {item.updatedAt}
                        </p>
                    </div>
                ))}
            </div>
        </SurfacePanel>
    );
}
