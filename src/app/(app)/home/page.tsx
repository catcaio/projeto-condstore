import { Suspense } from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { SettingsPage, SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge, Progress, Button } from '@/ui/components';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { getHomeFinancialSnapshot, getHomeAttributionSnapshot, getHomeInboxSnapshot } from './queries';
import { ConversationRow } from '../inbox/components/conversation-row';
import { AttributionRow } from '../attribution/components/attribution-row';
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
        <div className="flex flex-col min-h-full max-w-7xl mx-auto space-y-8 p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col gap-2 pb-6 border-b border-[hsl(var(--ui-border))]">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                    Operations Home
                </h1>
                <p className="text-base text-[hsl(var(--ui-text-muted))]">
                    Visão estratégica e consolidada do seu tenant.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Suspense fallback={
                    <div className="animate-pulse rounded-2xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] h-64" />
                }>
                    <FinancialSection tenantId={tenantId} />
                </Suspense>

                <Suspense fallback={
                    <div className="animate-pulse rounded-2xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] h-64" />
                }>
                    <ConversionSection tenantId={tenantId} inspectTenantId={inspectTenantId} />
                </Suspense>

                <Suspense fallback={
                    <div className="animate-pulse rounded-2xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] h-64 lg:col-span-3" />
                }>
                    <ActivitySection tenantId={tenantId} inspectTenantId={inspectTenantId} />
                </Suspense>
            </div>
        </div>
    );
}

async function FinancialSection({ tenantId }: { tenantId: string }) {
    const fin = await getHomeFinancialSnapshot(tenantId);

    const isHealthy = fin.state === 'active' || fin.state === 'unlocked';

    const statusBadge = () => {
        if (isHealthy) return <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-none">Active</Badge>;
        if (fin.state === 'past_due' || fin.state === 'locked') return <Badge variant="danger" className="bg-rose-500/10 text-rose-600 border-none">Limitado</Badge>;
        return <Badge variant="muted">{fin.state}</Badge>;
    };

    return (
        <div className="group relative flex flex-col p-6 rounded-2xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] hover:border-[hsl(var(--ui-brand)/0.4)] hover:shadow-lg transition-all duration-300 ease-out hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-sm border border-emerald-500/20">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <h2 className="font-semibold text-lg text-[hsl(var(--ui-text))]">Financeiro</h2>
                </div>
                {isHealthy && (
                    <span className="relative flex h-3 w-3" title="Status Operacional Saudável">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                )}
            </div>

            <div className="flex-1 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-[hsl(var(--ui-text-muted))]">Plano Atual</p>
                        <p className="text-sm font-semibold text-[hsl(var(--ui-text))] mt-1 capitalize">{fin.state.replace('_', ' ')}</p>
                    </div>
                    {statusBadge()}
                </div>

                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-[hsl(var(--ui-text-muted))]">Uso no mês</p>
                        <p className="text-sm font-semibold text-[hsl(var(--ui-text))] mt-1">
                            ${fin.currentMonthUsd.toFixed(2)} / ${fin.monthlyBudgetUsd > 0 ? fin.monthlyBudgetUsd.toFixed(2) : '∞'}
                        </p>
                    </div>
                    <div className="w-24 flex flex-col items-end gap-1.5">
                        <span className="text-xs text-[hsl(var(--ui-text))] font-bold">{fin.usagePercent.toFixed(1)}%</span>
                        <Progress
                            value={fin.usagePercent} max={100}
                            indicatorClassName={fin.usagePercent > 80 ? 'bg-rose-500' : 'bg-emerald-500'}
                            className="h-1.5 w-full bg-[hsl(var(--ui-border))]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

async function ConversionSection({ tenantId, inspectTenantId }: { tenantId: string; inspectTenantId?: string }) {
    const topAttribution = await getHomeAttributionSnapshot(tenantId);

    return (
        <div className="group relative flex flex-col p-6 rounded-2xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] hover:border-[hsl(var(--ui-brand)/0.4)] hover:shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 lg:col-span-2">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 shadow-sm border border-indigo-500/20">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <h2 className="font-semibold text-lg text-[hsl(var(--ui-text))]">Conversion Pulse (7d)</h2>
                </div>

                <Link href={{ pathname: '/attribution', query: { tenantId: inspectTenantId } }}>
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors">
                        Expandir ➔
                    </Button>
                </Link>
            </div>

            <div className="flex-1">
                {topAttribution ? (
                    <div className="border border-[hsl(var(--ui-border))] rounded-xl overflow-hidden shadow-sm">
                        <AttributionRow item={topAttribution} index={0} />
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-8 border border-dashed border-[hsl(var(--ui-border))] rounded-xl text-sm text-[hsl(var(--ui-text-muted))] bg-[hsl(var(--ui-bg))]">
                        Sem dados de conversão nos últimos 7 dias.
                    </div>
                )}
            </div>
        </div>
    );
}

async function ActivitySection({ tenantId, inspectTenantId }: { tenantId: string; inspectTenantId?: string }) {
    const items = await getHomeInboxSnapshot(tenantId);

    return (
        <div className="group relative flex flex-col p-6 rounded-2xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] hover:border-[hsl(var(--ui-brand)/0.4)] hover:shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 lg:col-span-3">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex justify-between items-center bg-amber-50 rounded-lg border border-amber-200 px-4 py-2 shadow-sm min-w-[200px]">
                        <div>
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest">Abertos</p>
                            <p className="text-2xl font-bold text-amber-900">{items.openCount}</p>
                        </div>
                        <div className="h-8 w-px bg-amber-200 mx-4"></div>
                        <div>
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest">Pendentes</p>
                            <p className="text-2xl font-bold text-amber-900">{items.pendingCount}</p>
                        </div>
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg text-[hsl(var(--ui-text))]">Fila Operacional Recente</h2>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))]">últimas interações rastreadas</p>
                    </div>
                </div>

                <Link href={{ pathname: '/inbox', query: { tenantId: inspectTenantId } }}>
                    <Button variant="secondary" size="sm" className="text-xs border-[hsl(var(--ui-border))] rounded-full whitespace-nowrap">
                        Visualizar Inbox ➔
                    </Button>
                </Link>
            </div>

            <div className="flex-1">
                {items.recentActivity.length > 0 ? (
                    <div className="border border-[hsl(var(--ui-border))] rounded-xl overflow-hidden divide-y divide-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]">
                        {items.recentActivity.map(item => <ConversationRow key={item.convoId} item={item} />)}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-8 border border-dashed border-[hsl(var(--ui-border))] rounded-xl text-sm text-[hsl(var(--ui-text-muted))] bg-[hsl(var(--ui-bg))]">
                        A fila está limpa. Nenhum ticket pendente.
                    </div>
                )}
            </div>
        </div>
    );
}
