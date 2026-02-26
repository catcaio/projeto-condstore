import React from 'react';
import { AcquisitionDrilldownClient } from './_components/AcquisitionDrilldownClient';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { headers } from 'next/headers';
import { canAccess, type Role } from '@/ui/auth/entitlements-logic';
import { getDb } from '@/infra/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import AccessDenied from '@/ui/components/AccessDenied';
import PlanRequired from '@/ui/components/PlanRequired';
import ServerErrorState from '@/ui/components/ServerErrorState';
import { serverFetchJson } from '@/ui/http/server-fetch';

export const dynamic = 'force-dynamic';

async function fetchDrilldownLogs(searchParams: Record<string, string | string[] | undefined>) {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = (host.startsWith('localhost') || host.startsWith('127.0.0.1')) ? 'http' : (process.env.NODE_ENV === 'development' ? 'http' : 'https');

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) params.set(key, value[0]);
    }

    const url = `${protocol}://${host}/api/cockpit/metrics/acquisition/drilldown?${params.toString()}`;

    return serverFetchJson<any>(url, {
        headers: { cookie: headersList.get('cookie') || '' },
        cache: 'no-store'
    });
}

export default async function AcquisitionDrilldownPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolvedParams = await searchParams;
    const headersList = await headers();
    const role = (headersList.get('x-auth-role') || 'viewer') as Role;
    const tenantId = headersList.get('x-auth-tenant-id') || '';

    let hasActivePlan = false;
    if (role === 'admin') {
        hasActivePlan = true;
    } else if (tenantId) {
        try {
            const db = await getDb();
            const results = await db.select({ plan: tenants.plan })
                .from(tenants).where(eq(tenants.id, tenantId)).limit(1);
            if (results.length > 0) {
                const { plan } = results[0];
                hasActivePlan = plan === 'ENTERPRISE' || plan === 'PRO' || plan === 'STARTER';
            }
        } catch {
            // fallback: no plan
        }
    }

    const groupByText = resolvedParams.groupBy === 'utm_campaign' ? 'Campanha' : 'Origem';
    const groupValue = resolvedParams.utm_campaign || resolvedParams.utm_source || 'Desconhecida';

    if (!canAccess('acquisition', { role, hasActivePlan })) {
        const reason = !hasActivePlan ? 'plan' : 'rbac';
        return (
            <div className="space-y-5 p-6 min-h-screen os-root">
                <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Detalhes de Aquisição</h1>
                {reason === 'plan' ? <PlanRequired /> : <AccessDenied />}
            </div>
        );
    }

    const res = await fetchDrilldownLogs(resolvedParams);

    if (!res.ok) {
        return (
            <div className="space-y-5 p-6 min-h-screen os-root">
                <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">
                    Detalhes de Aquisição
                </h1>
                <ServerErrorState
                    message={res.error?.message}
                    requestId={res.requestId}
                    status={res.status}
                />
            </div>
        );
    }

    const rawEvents = res.data?.events || [];
    const meta = res.data?.meta || { page: 1, limit: 20, total: 0, totalPages: 0 };

    const formattedData = rawEvents.map((event: any) => ({
        id: event.id,
        timestamp: event.timestamp || new Date().toISOString(),
        type: event.type || 'UNKNOWN',
        action: event.action || 'N/A',
    }));

    return (
        <div className="space-y-5 p-6 min-h-screen os-root">
            <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">
                Detalhes de Aquisição
            </h1>
            <p className="text-[hsl(var(--ui-text-muted))] mb-4">
                Visualização de eventos atrelados ao filtro {groupByText}: <span className="font-semibold text-[hsl(var(--ui-accent-blue))]">{groupValue}</span>
            </p>

            <Card variant="elevated">
                <CardHeader heading="Eventos Relacionados" subheading="Eventos públicos, cliques de atribuição e simulações." />
                <CardContent className="pt-0 p-4 relative">
                    <React.Suspense fallback={
                        <div className="h-40 flex items-center justify-center text-[hsl(var(--ui-text-muted))]">
                            Carregando eventos...
                        </div>
                    }>
                        <AcquisitionDrilldownClient
                            data={formattedData}
                            meta={meta}
                            initialError={false}
                            requestId={res.requestId || 'unknown'}
                        />
                    </React.Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
