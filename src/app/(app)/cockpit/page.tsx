import { Suspense } from 'react';
import { headers } from 'next/headers';
import { SettingsPage, SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { ShieldCheck, Database, Activity } from 'lucide-react';
import { getSystemHealth } from './queries';
import { getSystemStatus } from './system-status/queries';
import Link from 'next/link';

import { BillingSection } from './components/billing-section';
import { UsageSection } from './components/usage-section';
import { FunnelSection } from './components/funnel-section';
import { ActivitySection } from './components/activity-section';
import { BillingSkeleton, UsageSkeleton, FunnelSkeleton, ActivitySkeleton } from './components/skeletons';
import { ActivationSection } from './components/activation-section';

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

    const status = await getSystemStatus(tenantId, role || 'viewer');

    return (
        <SettingsPage
            title="Cockpit Operacional"
            description="Visão em tempo real das operações e saúde do sistema"
            headerAction={<Link href="/cockpit/system-status" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline flex items-center gap-1">Ver Centro de Comando &rarr;</Link>}
        >
            {/* MINI STATUS BAR */}
            <div className="flex gap-2 mb-6 w-full overflow-x-auto pb-2 scrollbar-hide shrink-0">
                <Badge variant={status.finops.state === 'ok' || status.finops.state === 'unlocked' ? 'success' : 'muted'} className="shrink-0 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> FinOps: {status.finops.state}
                </Badge>
                <Badge variant={status.knowledge.failedTotal > 0 ? 'danger' : 'success'} className="shrink-0 flex items-center gap-1">
                    <Database className="w-3 h-3" /> {status.knowledge.readyIndexedTotal} Docs Prontos
                </Badge>
                <Badge variant={status.infra.db === 'ok' && status.infra.redis === 'ok' ? 'success' : 'danger'} className="shrink-0 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Infra: {status.infra.db === 'ok' ? 'OK' : 'Falha'}
                </Badge>
            </div>
            <Suspense fallback={<BillingSkeleton />}>
                <BillingSection tenantId={tenantId} />
            </Suspense>

            <Suspense fallback={<UsageSkeleton />}>
                <UsageSection tenantId={tenantId} />
            </Suspense>

            <Suspense fallback={<FunnelSkeleton />}>
                <ActivationSection tenantId={tenantId} />
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
