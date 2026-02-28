import { SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { CreditCard, Calendar } from 'lucide-react';
import { getBillingSummary } from '../queries';
import { EmptyBilling } from './empty-states';

const statusVariants: Record<string, "success" | "danger" | "muted" | "outline"> = {
    active: 'success',
    canceled: 'muted',
    past_due: 'danger',
    unlocked: 'success',
    degraded: 'outline',
    locked: 'danger',
};

export async function BillingSection({ tenantId }: { tenantId: string }) {
    const data = await getBillingSummary(tenantId);

    if (!data.planId) {
        return <EmptyBilling />;
    }

    const { status, planId, currentPeriodEnd, cancelAtPeriodEnd } = data;
    const variant = statusVariants[status] || 'muted';
    const isFree = planId === 'FREE';

    return (
        <SettingsSection title="Billing & Plan">
            <SettingsRow
                icon={<CreditCard className="h-5 w-5" />}
                label={
                    <span className="flex items-center gap-2">
                        <span>Plano: {planId.toUpperCase()}</span>
                    </span>
                }
                description={
                    cancelAtPeriodEnd
                        ? "Cancelamento agendado para o fim do período."
                        : "Sua renovação está operando normalmente."
                }
                value={
                    <Badge variant={variant}>
                        {cancelAtPeriodEnd ? 'CANCELED' : status.toUpperCase()}
                    </Badge>
                }
            />
            {!isFree && currentPeriodEnd && (
                <SettingsRow
                    icon={<Calendar className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Período Vigente"
                    description="Vencimento da próxima fatura"
                    value={new Date(currentPeriodEnd).toLocaleDateString('pt-BR')}
                />
            )}
        </SettingsSection>
    );
}
