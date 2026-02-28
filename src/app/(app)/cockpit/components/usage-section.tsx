import { SettingsSection, SettingsRow } from '@/ui/settings';
import { Progress, Badge } from '@/ui/components';
import { DollarSign, Activity } from 'lucide-react';
import { getUsageSummary } from '../queries';
import { EmptyUsage } from './empty-states';
import { planEnforcementService } from '../../../../modules/finops/plan-enforcement.service';

const statusVariants: Record<string, "success" | "danger" | "muted" | "outline"> = {
    unlocked: 'success',
    degraded: 'outline',
    locked: 'danger',
};

export async function UsageSection({ tenantId }: { tenantId: string }) {
    const data = await getUsageSummary(tenantId);

    // Consider empty if monthly tokens and budget are minimal/unset and no consumption
    if (data.tokensConsumed === 0 && data.currentMonthUsd === 0) {
        return <EmptyUsage />;
    }

    const {
        tokensConsumed,
        monthlyTokenLimit,
        percentUsedTokens,
        currentMonthUsd,
        monthlyBudgetUsd,
        percentUsedUsd
    } = data;

    const limitDisplay = monthlyTokenLimit >= 1_000_000_000 ? "∞" : monthlyTokenLimit.toLocaleString();
    const hasUsdBudget = monthlyBudgetUsd > 0;

    const planData = await planEnforcementService.getPlanStatus(tenantId);

    // Convert to numbers for Progress
    const pctFreight = Number(planData.percentFreight);
    const pctWhatsapp = Number(planData.percentWhatsapp);

    // Status text logic
    const estadoMap: Record<string, { label: string, color: typeof statusVariants[string] }> = {
        unlocked: { label: 'Regular', color: 'success' },
        degraded_preemptive: { label: 'Atenção (Alerta de Uso)', color: 'outline' },
        degraded: { label: 'Degradado (Limite Atingido)', color: 'outline' },
        locked: { label: 'Bloqueado (Pagamento Req.)', color: 'danger' }
    };

    const statusText = estadoMap[planData.state]?.label || 'Regular';
    const statusColor = estadoMap[planData.state]?.color || 'success';

    return (
        <SettingsSection title="Usage & FinOps">
            <SettingsRow
                icon={<Activity className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                label="Limites de Tokens LLM"
                description={(
                    <span>
                        <span className="font-semibold">{tokensConsumed.toLocaleString()}</span> de {limitDisplay} consumidos
                    </span>
                )}
            />
            <div className="px-4 pb-4 pt-2">
                <Progress
                    value={percentUsedTokens}
                    max={100}
                    indicatorClassName={percentUsedTokens > 80 ? 'bg-[hsl(var(--ui-danger))]' : 'bg-[hsl(var(--ui-accent-blue))]'}
                />
                <div className="flex justify-between mt-2 text-[12px] font-medium text-[hsl(var(--ui-text-muted))]">
                    <span>Cota de processamento</span>
                    <span>{percentUsedTokens.toFixed(1)}% utilizado</span>
                </div>
            </div>

            {hasUsdBudget && (
                <div className="border-t border-[hsl(var(--ui-border))]">
                    <SettingsRow
                        icon={<DollarSign className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                        label="Gasto Acumulado Mensal"
                        description={`Budget definido: $${monthlyBudgetUsd.toFixed(2)}`}
                        value={`$${currentMonthUsd.toFixed(2)}`}
                    />
                    <div className="px-4 pb-4 pt-2">
                        <Progress
                            value={percentUsedUsd}
                            max={100}
                            indicatorClassName={percentUsedUsd > 80 ? 'bg-[hsl(var(--ui-danger))]' : undefined}
                        />
                        <div className="flex justify-between mt-2 text-[12px] font-medium text-[hsl(var(--ui-text-muted))]">
                            <span>Limite financeiro</span>
                            <span>{percentUsedUsd.toFixed(1)}% utilizado</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="border-t border-[hsl(var(--ui-border))]">
                <SettingsRow
                    icon={<Activity className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Uso do Plano"
                    description={`Plano atual: ${planData.plan.toUpperCase()}`}
                    value={<Badge variant={statusColor as any}>{statusText}</Badge>}
                />

                <div className="px-4 pb-4 pt-2 space-y-4">
                    <div>
                        <div className="flex justify-between mb-1 text-[13px] font-medium text-[hsl(var(--ui-text))]">
                            <span>Cotações este mês</span>
                            <span>{planData.usage.freight_simulations_per_month} / {planData.limits.freight_simulations_per_month}</span>
                        </div>
                        <Progress
                            value={pctFreight}
                            max={100}
                            indicatorClassName={pctFreight >= 100 ? 'bg-[hsl(var(--ui-danger))]' : pctFreight >= 80 ? 'bg-[hsl(var(--ui-warning-ink))]' : 'bg-[hsl(var(--ui-accent-blue))]'}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-1 text-[13px] font-medium text-[hsl(var(--ui-text))]">
                            <span>Mensagens WhatsApp</span>
                            <span>{planData.usage.whatsapp_outbound_per_month} / {planData.limits.whatsapp_outbound_per_month}</span>
                        </div>
                        <Progress
                            value={pctWhatsapp}
                            max={100}
                            indicatorClassName={pctWhatsapp >= 100 ? 'bg-[hsl(var(--ui-danger))]' : pctWhatsapp >= 80 ? 'bg-[hsl(var(--ui-warning-ink))]' : 'bg-[hsl(var(--ui-accent-blue))]'}
                        />
                    </div>
                </div>

                {(planData.state === 'locked' || Number(planData.maxPercent) >= 80) && (
                    <div className="px-4 pb-4">
                        <a href="/billing" className="block w-full">
                            <button className={`w-full py-2 px-4 rounded-md font-medium text-sm transition-colors ${planData.state === 'locked' ? 'bg-[hsl(var(--ui-danger))] text-[hsl(var(--ui-danger-ink))] hover:bg-[hsl(var(--ui-danger)/0.9)]' : 'bg-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-border-hover))]'}`}>
                                {planData.state === 'locked' ? 'Regularizar Plano' : 'Aumentar Limite'}
                            </button>
                        </a>
                    </div>
                )}
            </div>
        </SettingsSection>
    );
}
