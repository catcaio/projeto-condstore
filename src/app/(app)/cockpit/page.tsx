import { Suspense } from 'react';
import { headers } from 'next/headers';
import { SettingsPage, SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { ShieldCheck, Database, Activity } from 'lucide-react';
import { getSystemHealth } from './queries';

import { BillingSection } from './components/billing-section';
import { UsageSection } from './components/usage-section';
import { FunnelSection } from './components/funnel-section';
import { ActivitySection } from './components/activity-section';
import { BillingSkeleton, UsageSkeleton, FunnelSkeleton, ActivitySkeleton } from './components/skeletons';

export default async function CockpitPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');

    // guard
    const actAsSuperAdmin = isSuperAdmin(role) && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    return (
        <SettingsPage
            title="Cockpit Operacional"
            description="Visão em tempo real das operações e saúde do sistema"
            headerAction={<span className="text-xs text-[hsl(var(--ui-text-muted))]">Atualizado agora</span>}
        >
            <Suspense fallback={<BillingSkeleton />}>
                <BillingSection tenantId={tenantId} />
            </Suspense>

            <Suspense fallback={<UsageSkeleton />}>
                <UsageSection tenantId={tenantId} />
            </Suspense>

            <Suspense fallback={<FunnelSkeleton />}>
                <FunnelSection tenantId={tenantId} />
            </Suspense>

            <Suspense fallback={<ActivitySkeleton />}>
                <ActivitySection tenantId={tenantId} />
            </Suspense>

            <Suspense fallback={null}>
                <SystemHealthSection tenantId={tenantId} />
            </Suspense>
        </SettingsPage>
    );
}

async function SystemHealthSection({ tenantId }: { tenantId: string }) {
    const health = await getSystemHealth(tenantId);

    return (
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
    );
}
