import React from 'react';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { headers } from 'next/headers';
import { AcquisitionClient } from './_components/AcquisitionClient';
import { canAccess, type Role } from '@/ui/auth/entitlements-logic';
import { getDb } from '@/infra/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import AccessDenied from '@/ui/components/AccessDenied';
import PlanRequired from '@/ui/components/PlanRequired';
import ServerErrorState from '@/ui/components/ServerErrorState';
import { serverFetchJson } from '@/ui/http/server-fetch';

export const dynamic = 'force-dynamic';

async function fetchAcquisitionData(searchParams: Record<string, string | string[] | undefined>) {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = (host.startsWith('localhost') || host.startsWith('127.0.0.1')) ? 'http' : (process.env.NODE_ENV === 'development' ? 'http' : 'https');

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) params.set(key, value[0]);
    }

    if (!params.has('window')) params.set('window', '30d');
    if (!params.has('groupBy')) params.set('groupBy', 'utm_source');

    const url = `${protocol}://${host}/api/cockpit/metrics/acquisition?${params.toString()}`;

    return serverFetchJson<any>(url, {
        headers: { cookie: headersList.get('cookie') || '' },
        cache: 'no-store'
    });
}

export default async function AcquisitionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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

    if (!canAccess('acquisition', { role, hasActivePlan })) {
        const reason = !hasActivePlan ? 'plan' : 'rbac';
        return (
            <div className="space-y-5 p-6 min-h-screen os-root">
                <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Acquisition (UTM)</h1>
                {reason === 'plan' ? <PlanRequired /> : <AccessDenied />}
            </div>
        );
    }

    const res = await fetchAcquisitionData(resolvedParams);

    if (!res.ok) {
        return (
            <div className="space-y-5 p-6 min-h-screen os-root">
                <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Acquisition (UTM)</h1>
                <ServerErrorState
                    message={res.error?.message}
                    requestId={res.requestId}
                    status={res.status}
                />
            </div>
        );
    }

    const rows = res.data?.rows || [];
    const totals = res.data?.totals || null;
    const meta = res.data?.meta || { page: 1, limit: 20, total: 0, totalPages: 0 };

    return (
        <div className="space-y-5 p-6 min-h-screen os-root">
            <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Acquisition (UTM)</h1>
            <p className="text-[hsl(var(--ui-text-muted))] mb-4">
                Análise de performance de tráfego, sessões e simulações agrupadas por UTMs.
            </p>

            <Card variant="elevated">
                <CardHeader heading="Atribuição de Performance" subheading="Filtros dinâmicos e exportação de dados" />
                <CardContent className="pt-0 p-4 relative">
                    <React.Suspense fallback={
                        <div className="h-40 flex items-center justify-center text-[hsl(var(--ui-text-muted))]">
                            Carregando métricas de aquisição...
                        </div>
                    }>
                        <AcquisitionClient
                            data={rows}
                            meta={meta}
                            totals={totals}
                            initialError={false}
                            requestId={res.requestId || 'unknown'}
                        />
                    </React.Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
