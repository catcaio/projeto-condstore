import { headers } from 'next/headers';
import { SettingsPage, SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge, Progress } from '@/ui/components';
import { ShieldCheck, Activity, Database, Zap, Truck, DollarSign, Package, AlertCircle } from 'lucide-react';
import {
    getBillingSummary,
    getUsageSummary,
    getFunnelSummary,
    getSystemHealth,
    getRecentActivity
} from './queries';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function CockpitPage() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    const [billing, usage, funnel, health, activity] = await Promise.all([
        getBillingSummary(tenantId),
        getUsageSummary(tenantId),
        getFunnelSummary(tenantId),
        getSystemHealth(tenantId),
        getRecentActivity(tenantId),
    ]);

    const percentUsed = billing.monthlyBudgetUsd > 0
        ? (billing.currentMonthUsd / billing.monthlyBudgetUsd) * 100
        : 0;

    return (
        <SettingsPage
            title="Cockpit Operacional"
            description="Visão em tempo real das operações e saúde do sistema"
            headerAction={<Badge variant="success">Operacional</Badge>}
        >
            <SettingsSection title="Métricas de Funil (7 dias)">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[hsl(var(--ui-border))]">
                    <div className="flex flex-col gap-1 p-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Simulações Iniciadas</span>
                        <span className="text-2xl font-bold text-[hsl(var(--ui-text))]">{funnel.flow_started ?? 0}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">CEP Informado</span>
                        <span className="text-2xl font-bold text-[hsl(var(--ui-text))]">{funnel.cep_provided ?? 0}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Frete Cotado</span>
                        <span className="text-2xl font-bold text-[hsl(var(--ui-accent-blue))]">{funnel.freight_quoted ?? 0}</span>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Uso & Frete">
                <SettingsRow
                    icon={<Truck className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Volume Simulado (7 dias)"
                    description="Total de pacotes e peso médio na base"
                    value={`${usage.total_simulations ?? 0} envios`}
                />
                <SettingsRow
                    icon={<Package className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Peso Médio dos Pedidos"
                    value={`${Number(usage.avg_peso ?? 0).toFixed(2)} kg`}
                />
            </SettingsSection>

            <SettingsSection title="FinOps Budget">
                <SettingsRow
                    icon={<DollarSign className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Gasto Acumulado Mensal"
                    description={`Status: ${billing.state === 'unlocked' ? 'Liberado' : 'Limitado'}`}
                    value={`$${Number(billing.currentMonthUsd).toFixed(2)} / $${billing.monthlyBudgetUsd > 0 ? Number(billing.monthlyBudgetUsd).toFixed(2) : '∞'}`}
                />
                <div className="px-4 pb-4 pt-2">
                    <Progress value={percentUsed} max={100} indicatorClassName={percentUsed > 80 ? 'bg-[hsl(var(--ui-danger))]' : undefined} />
                    <div className="flex justify-between mt-2 text-xs text-[hsl(var(--ui-text-muted))]">
                        <span>Burn Rate: ${Number(billing.burnRatePerDay ?? 0).toFixed(4)}/dia</span>
                        <span>{percentUsed.toFixed(1)}% utilizado</span>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Atividade Recente">
                {activity.length === 0 ? (
                    <div className="p-4 text-sm text-[hsl(var(--ui-text-muted))]">Sem eventos registrados recentemente.</div>
                ) : (
                    activity.map((ev, i) => (
                        <SettingsRow
                            key={i}
                            icon={<Zap className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />}
                            label={`Funil: ${ev.stage}`}
                            description={ev.phoneNumber ? `Origem: ${ev.phoneNumber}` : `Ref: ${ev.sessionId}`}
                            value={formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true, locale: ptBR })}
                        />
                    ))
                )}
            </SettingsSection>

            <SettingsSection title="Saúde do Sistema">
                <SettingsRow
                    icon={<Database className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Banco de Dados Principal"
                    value={<Badge variant={health.dbOk ? "success" : "danger"}>{health.dbOk ? "Conectado" : "Falha"}</Badge>}
                />
                <SettingsRow
                    icon={<Activity className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Cache Redis"
                    value={<Badge variant={health.redisOk ? "success" : "danger"}>{health.redisOk ? "ONLINE" : "OFFLINE"}</Badge>}
                />
                <SettingsRow
                    icon={<ShieldCheck className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Rollups em Segundo Plano"
                    value={<Badge variant={health.rollupOk ? "success" : "danger"}>{health.rollupOk ? "Ativo" : "Pausado"}</Badge>}
                />
            </SettingsSection>
        </SettingsPage>
    );
}
