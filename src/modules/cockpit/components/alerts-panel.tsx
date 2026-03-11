import Link from 'next/link';
import { AlertBlock, EmptyState, SectionHeader, SurfacePanel } from '@/ui/foundation';
import type { CockpitAlert } from '../data/shared';
import { cockpitAlerts } from '../mock-data';

function mapPriority(priority: 'critical' | 'warning' | 'info') {
    if (priority === 'critical') {
        return 'critical' as const;
    }
    if (priority === 'warning') {
        return 'warning' as const;
    }
    return 'info' as const;
}

export function CockpitAlertsPanel({ alerts = cockpitAlerts }: { alerts?: CockpitAlert[] }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Alertas operacionais"
                description="Itens com impacto direto na fila, no pedido ou na disponibilidade da operacao."
            />
            <div className="mt-4 space-y-3">
                {alerts.length === 0 ? (
                    <EmptyState
                        title="Sem alertas acionaveis"
                        description="As fontes conectadas nao reportaram itens criticos ou warnings neste momento."
                    />
                ) : (
                    alerts.map((alert) => (
                        <Link key={alert.id} href={alert.href} className="block">
                            <AlertBlock
                                title={alert.title}
                                description={alert.description}
                                tone={mapPriority(alert.priority)}
                                action={alert.action}
                            />
                        </Link>
                    ))
                )}
            </div>
        </SurfacePanel>
    );
}
