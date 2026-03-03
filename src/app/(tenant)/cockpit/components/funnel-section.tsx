import { SettingsSection } from '@/ui/settings';
import { getFunnelSummary } from '../queries';
import { EmptyFunnel } from './empty-states';

export async function FunnelSection({ tenantId }: { tenantId: string }) {
    const data = await getFunnelSummary(tenantId);

    if (data.total === 0) {
        return <EmptyFunnel />;
    }

    // Adapt to standard keys logic or fallback to legacy stages
    const started = data['INTENT_DETECTED'] || data['flow_started'] || 0;
    const provided = data['CEP_RECEIVED'] || data['cep_provided'] || 0;
    const quoted = data['QUOTE_SENT'] || data['freight_quoted'] || 0;

    const convProvided = started > 0 ? ((provided / started) * 100).toFixed(1) : '0.0';
    const convQuoted = provided > 0 ? ((quoted / provided) * 100).toFixed(1) : '0.0';

    return (
        <SettingsSection title="Performance do Funil (Últimos 7 dias)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[hsl(var(--ui-border))]">
                <div className="flex flex-col gap-1 p-4 bg-[hsl(var(--ui-surface))] hover:bg-[hsl(var(--ui-muted))] transition-colors">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] flex items-center justify-between">
                        Simulações Iniciadas
                        <span className="text-[9px] bg-[hsl(var(--ui-border))] rounded-full px-2 py-0.5">Top Funnel</span>
                    </span>
                    <span className="text-3xl font-bold text-[hsl(var(--ui-text))] mt-1">{started}</span>
                    <span className="text-xs text-[hsl(var(--ui-text-subtle))] mt-1">Visitantes retidos</span>
                </div>

                <div className="flex flex-col gap-1 p-4 bg-[hsl(var(--ui-surface))] hover:bg-[hsl(var(--ui-muted))] transition-colors">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] flex items-center justify-between">
                        CEP Informado
                        <span className="text-[9px] bg-[hsl(var(--ui-accent-blue)/0.15)] text-[hsl(var(--ui-accent-blue-ink))] rounded-full px-2 py-0.5 font-bold">
                            {convProvided}%
                        </span>
                    </span>
                    <span className="text-3xl font-bold text-[hsl(var(--ui-text))] mt-1">{provided}</span>
                    <span className="text-xs text-[hsl(var(--ui-text-subtle))] mt-1">Interações com destino</span>
                </div>

                <div className="flex flex-col gap-1 p-4 bg-[hsl(var(--ui-surface))] hover:bg-[hsl(var(--ui-muted))] transition-colors">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] flex items-center justify-between">
                        Frete Cotado
                        <span className="text-[9px] bg-[hsl(var(--ui-success)/0.15)] text-[hsl(var(--ui-success-ink))] rounded-full px-2 py-0.5 font-bold">
                            {convQuoted}%
                        </span>
                    </span>
                    <span className="text-3xl font-bold text-[hsl(var(--ui-accent-blue))] mt-1">{quoted}</span>
                    <span className="text-xs text-[hsl(var(--ui-text-subtle))] mt-1">Cotações geradas</span>
                </div>
            </div>
        </SettingsSection>
    );
}
