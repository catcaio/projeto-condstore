import React from 'react';
import { Card } from '../../../ui/primitives/Card';
import { Stack } from '../../../ui/primitives/Stack';
import { Button } from '../../../ui/primitives/Button';
import { SubscriptionRecord } from '../../lib/billing/types';

interface BillingStatusCardProps {
    subscription: SubscriptionRecord | null;
    isLoading: boolean;
}

const statusMap: Record<string, { label: string, colorClass: string }> = {
    active: { label: 'Ativo', colorClass: 'bg-green-100 text-green-800 border-green-200' },
    trialing: { label: 'Em período de teste', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' },
    past_due: { label: 'Pagamento pendente', colorClass: 'bg-orange-100 text-orange-800 border-orange-200' },
    canceled: { label: 'Cancelado', colorClass: 'bg-red-100 text-red-800 border-red-200' },
    incomplete: { label: 'Incompleto', colorClass: 'bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-default)]' },
    none: { label: 'Sem plano ativo', colorClass: 'bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-default)]' }
};

export const BillingStatusCard = ({ subscription, isLoading }: BillingStatusCardProps) => {

    if (isLoading) {
        return (
            <Card className="animate-pulse">
                <Stack space={16}>
                    <div className="h-6 bg-[var(--bg-panel)] rounded w-1/3"></div>
                    <div className="h-4 bg-[var(--bg-panel)] rounded w-1/2"></div>
                    <div className="h-[56px] bg-[var(--bg-panel)] rounded w-full mt-4"></div>
                </Stack>
            </Card>
        );
    }

    const isActive = subscription && ['active', 'trialing'].includes(subscription.status);
    const planName = subscription ? subscription.planId.toUpperCase() : 'FREE';
    const statusData = subscription ? (statusMap[subscription.status] || statusMap.none) : statusMap.none;

    const renewalDate = subscription && subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString('pt-BR')
        : null;

    return (
        <Card variant={isActive ? "recommended" : "default"}>
            <Stack space={16}>
                <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                        <p className="text-[var(--text-muted)] text-[var(--text-secondary)] uppercase tracking-wider font-semibold mb-1">
                            Plano Atual
                        </p>
                        <h2 className="text-[var(--text-hero)] font-bold text-[var(--brand-black)] leading-tight">
                            {planName}
                        </h2>
                    </div>

                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusData.colorClass}`}>
                        {statusData.label}
                    </span>
                </div>

                {subscription && (
                    <div className="bg-[var(--surface-muted)] p-3 rounded-[var(--radius-card)] text-[var(--text-base)]">
                        <p className="text-[var(--text-secondary)] flex justify-between">
                            <span>{subscription.cancelAtPeriodEnd ? "Acesso até" : "Próxima cobrança"}:</span>
                            <span className="font-semibold">{renewalDate}</span>
                        </p>
                        {subscription.cancelAtPeriodEnd && (
                            <p className="text-red-600 text-[12px] mt-1">Este plano será cancelado ao final do período.</p>
                        )}
                    </div>
                )}

                <div className="pt-2">
                    {isActive ? (
                        <Button
                            variant="secondary"
                            className="w-full justify-center h-[56px]"
                            onClick={() => window.location.href = '/billing/manage'}
                        >
                            Gerenciar assinatura
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            className="w-full justify-center h-[56px]"
                            onClick={() => window.location.href = '/pricing'}
                        >
                            Ver planos
                        </Button>
                    )}
                </div>
            </Stack>
        </Card>
    );
};
