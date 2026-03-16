import Link from 'next/link';
import { Button } from '@/ui/components';
import { Play, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { SectionHeader, StatusChip, SurfacePanel } from '@/ui/foundation';
import type { ClientSimulationActivity, ClientSimulationStatus } from '../types';

function getStatusTone(status: ClientSimulationStatus) {
    if (status === 'contingencia') {
        return 'warning' as const;
    }
    if (status === 'aprovada') {
        return 'success' as const;
    }
    return 'info' as const;
}

export function ClientSimulations({
    clientId,
    items,
    title = 'Ultimas simulacoes',
    description = 'Cotacoes recentes para manter leitura de margem e contingencia.',
    compact = false,
}: {
    clientId: string;
    items: ClientSimulationActivity[];
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
                    <Link href={`/logistica?cliente=${clientId}`}>
                        <Button variant="secondary" size="sm">Abrir em logistica</Button>
                    </Link>
                }
            />
            <div className="mt-4 space-y-3">
                {items.slice(0, compact ? 2 : 3).map((item) => (
                    <div key={item.id} className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{item.id}</p>
                                <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">{item.route} • {item.carrier}</p>
                            </div>
                            <StatusChip label={item.status} tone={getStatusTone(item.status)} />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-[hsl(var(--ui-text))]">{item.value}</span>
                            <span className="text-[hsl(var(--ui-text-subtle))]">{item.updatedAt}</span>
                        </div>
                    </div>
                ))}
            </div>
        </SurfacePanel>
    );
}
