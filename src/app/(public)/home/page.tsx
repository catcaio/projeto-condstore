import { Suspense } from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { SettingsPage, SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge, Progress, Button } from '@/ui/components';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { getHomeFinancialSnapshot, getHomeAttributionSnapshot, getHomeInboxSnapshot } from './queries';
import { ConversationRow } from '@/app/(tenant)/inbox/components/conversation-row';
import { AttributionRow } from '@/app/(system)/attribution/components/attribution-row';
import { CreditCard, DollarSign } from 'lucide-react';

export const metadata = {
    title: 'Home — Condstore OS',
};

export default async function HomePage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');

    const actAsSuperAdmin = isSuperAdmin(role) && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    return (
        <SettingsPage
            title="Operations Home"
            description="Visão consolidada do seu tenant"
        >
            <Suspense fallback={
                <SettingsSection title="Financial Status">
                    <div className="animate-pulse rounded-md bg-[hsl(var(--ui-muted))] h-24 m-4" />
                </SettingsSection>
            }>
                <FinancialSection tenantId={tenantId} />
            </Suspense>

            <Suspense fallback={
                <SettingsSection title="Conversion Pulse (7d)">
                    <div className="animate-pulse rounded-md bg-[hsl(var(--ui-muted))] h-16 m-4" />
                </SettingsSection>
            }>
                <ConversionSection tenantId={tenantId} inspectTenantId={inspectTenantId} />
            </Suspense>

            <Suspense fallback={
                <SettingsSection title="Recent Activity">
                    <div className="animate-pulse flex flex-col gap-2 m-4">
                        <div className="rounded-md bg-[hsl(var(--ui-muted))] h-12 w-full" />
                        <div className="rounded-md bg-[hsl(var(--ui-muted))] h-12 w-full" />
                    </div>
                </SettingsSection>
            }>
                <ActivitySection tenantId={tenantId} inspectTenantId={inspectTenantId} />
            </Suspense>
        </SettingsPage>
    );
}

async function FinancialSection({ tenantId }: { tenantId: string }) {
    const fin = await getHomeFinancialSnapshot(tenantId);

    const statusBadge = () => {
        if (fin.state === 'active' || fin.state === 'unlocked') return <Badge variant="success">Active</Badge>;
        if (fin.state === 'past_due' || fin.state === 'locked') return <Badge variant="danger">Limitado</Badge>;
        return <Badge variant="muted">{fin.state}</Badge>;
    };

    return (
        <SettingsSection title="Financial Status">
            <SettingsRow
                icon={<CreditCard className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                label="Plano Atual"
                description={`Status: ${fin.state}`}
                value={statusBadge()}
            />
            <SettingsRow
                icon={<DollarSign className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                label="Uso no mês"
                description={`Consumido: $${fin.currentMonthUsd.toFixed(2)} / $${fin.monthlyBudgetUsd > 0 ? fin.monthlyBudgetUsd.toFixed(2) : '∞'}`}
                value={
                    <div className="w-32 flex flex-col items-end gap-1.5">
                        <span className="text-xs text-[hsl(var(--ui-text))] font-bold">{fin.usagePercent.toFixed(1)}% utilizado</span>
                        <Progress
                            value={fin.usagePercent} max={100}
                            indicatorClassName={fin.usagePercent > 80 ? 'bg-[hsl(var(--ui-danger))]' : undefined}
                            className="h-1.5"
                        />
                    </div>
                }
            />
        </SettingsSection>
    );
}

async function ConversionSection({ tenantId, inspectTenantId }: { tenantId: string; inspectTenantId?: string }) {
    const topAttribution = await getHomeAttributionSnapshot(tenantId);

    return (
        <SettingsSection title="Conversion Pulse (7d)">
            {topAttribution ? (
                <AttributionRow item={topAttribution} index={0} />
            ) : (
                <div className="px-4 py-8 text-center text-sm text-[hsl(var(--ui-text-muted))]">
                    Sem dados de conversão nos últimos 7 dias.
                </div>
            )}

            <div className="px-4 py-3 flex justify-end border-t border-[hsl(var(--ui-border))]">
                <Link href={{ pathname: '/attribution', query: { tenantId: inspectTenantId } }}>
                    <Button variant="secondary" className="text-xs h-8 px-4 rounded-full border border-[hsl(var(--ui-border))]">
                        Ver Attribution
                    </Button>
                </Link>
            </div>
        </SettingsSection>
    );
}

async function ActivitySection({ tenantId, inspectTenantId }: { tenantId: string; inspectTenantId?: string }) {
    const items = await getHomeInboxSnapshot(tenantId);

    return (
        <SettingsSection title={`Fila Operacional: ${items.openCount} Open, ${items.pendingCount} Pending`}>
            {items.recentActivity.length > 0 ? (
                items.recentActivity.map((item: any) => <ConversationRow key={item.convoId} item={item} />)
            ) : (
                <div className="px-4 py-8 text-center text-sm text-[hsl(var(--ui-text-muted))]">
                    Fila vazia.
                </div>
            )}

            <div className="px-4 py-3 flex justify-end border-t border-[hsl(var(--ui-border))]">
                <Link href={{ pathname: '/inbox', query: { tenantId: inspectTenantId } }}>
                    <Button variant="secondary" className="text-xs h-8 px-4 rounded-full border border-[hsl(var(--ui-border))]">
                        Ver Inbox
                    </Button>
                </Link>
            </div>
        </SettingsSection>
    );
}
