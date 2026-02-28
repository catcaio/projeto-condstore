import { SettingsSection, SettingsRow } from '@/ui/settings';
import { Progress, Badge } from '@/ui/components';
import { DollarSign, Activity } from 'lucide-react';
import { getUsageSummary } from '../queries';
import { EmptyUsage } from './empty-states';

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
        </SettingsSection>
    );
}
