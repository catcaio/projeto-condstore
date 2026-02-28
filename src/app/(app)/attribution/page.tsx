import { Suspense } from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { SettingsPage } from '@/ui/settings';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { getAttributionSummary, type GroupByParam } from './queries';
import { AttributionTable } from './components/attribution-table';
import { AttributionSkeleton } from './components/skeletons';
import { Target } from 'lucide-react';

export const metadata = {
    title: 'Attribution — Condstore OS',
};

export default async function AttributionPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    // Parse filters
    const validGroupings: GroupByParam[] = ['utmSource', 'utmCampaign', 'utmMedium'];
    const groupByRaw = typeof searchParams.groupBy === 'string' ? searchParams.groupBy : 'utmSource';
    const groupBy = validGroupings.includes(groupByRaw as GroupByParam) ? (groupByRaw as GroupByParam) : 'utmSource';

    const rangeRaw = searchParams.range === '30d' ? 30 : 7;
    const rangeDays = rangeRaw;

    const source = typeof searchParams.source === 'string' ? searchParams.source : undefined;
    const campaign = typeof searchParams.campaign === 'string' ? searchParams.campaign : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');

    const actAsSuperAdmin = isSuperAdmin(role) && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    // Helper functions for links
    const getRangeHref = (days: '7d' | '30d') => ({
        pathname: '/attribution',
        query: { tenantId: inspectTenantId, groupBy, range: days, source, campaign }
    });

    const getGroupHref = (gb: GroupByParam) => ({
        pathname: '/attribution',
        query: { tenantId: inspectTenantId, groupBy: gb, range: rangeDays === 30 ? '30d' : '7d', source, campaign }
    });

    return (
        <SettingsPage
            title="Attribution"
            description="Métricas de aquisição e conversão agrupadas por UTM."
        >
            <div className="flex flex-col md:flex-row gap-4 mb-6 px-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[hsl(var(--ui-text-muted))] uppercase tracking-wider">Período:</span>
                    <Link href={getRangeHref('7d')}>
                        <span className={`text-xs px-3 py-1 rounded-full border cursor-pointer ${rangeDays === 7 ? 'bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-accent-blue-ink))] border-transparent font-medium' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                            7 dias
                        </span>
                    </Link>
                    <Link href={getRangeHref('30d')}>
                        <span className={`text-xs px-3 py-1 rounded-full border cursor-pointer ${rangeDays === 30 ? 'bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-accent-blue-ink))] border-transparent font-medium' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                            30 dias
                        </span>
                    </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[hsl(var(--ui-text-muted))] uppercase tracking-wider md:ml-4">Agrupar por:</span>
                    <Link href={getGroupHref('utmSource')}>
                        <span className={`text-xs px-3 py-1 rounded-full border cursor-pointer ${groupBy === 'utmSource' ? 'bg-[hsl(var(--ui-text))] text-[hsl(var(--ui-surface))] border-transparent font-medium' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                            Source
                        </span>
                    </Link>
                    <Link href={getGroupHref('utmCampaign')}>
                        <span className={`text-xs px-3 py-1 rounded-full border cursor-pointer ${groupBy === 'utmCampaign' ? 'bg-[hsl(var(--ui-text))] text-[hsl(var(--ui-surface))] border-transparent font-medium' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                            Campaign
                        </span>
                    </Link>
                    <Link href={getGroupHref('utmMedium')}>
                        <span className={`text-xs px-3 py-1 rounded-full border cursor-pointer ${groupBy === 'utmMedium' ? 'bg-[hsl(var(--ui-text))] text-[hsl(var(--ui-surface))] border-transparent font-medium' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                            Medium
                        </span>
                    </Link>
                </div>
            </div>

            <Suspense fallback={<AttributionSkeleton />} key={groupBy + rangeDays + (source || '') + (campaign || '')}>
                <AttributionContent
                    tenantId={tenantId}
                    rangeDays={rangeDays}
                    groupBy={groupBy}
                    filters={{ source, campaign }}
                />
            </Suspense>
        </SettingsPage>
    );
}

async function AttributionContent({
    tenantId,
    rangeDays,
    groupBy,
    filters
}: {
    tenantId: string,
    rangeDays: number,
    groupBy: GroupByParam,
    filters: { source?: string, campaign?: string }
}) {
    const items = await getAttributionSummary(tenantId, rangeDays, groupBy, filters);
    return <AttributionTable items={items} />;
}
