import React from 'react';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { headers } from 'next/headers';
import { AcquisitionClient } from './_components/AcquisitionClient';
import { canAccess, type Role } from '@/ui/auth/entitlements-logic';
import { getDb } from '@/infra/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { Lock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function fetchAcquisitionData(searchParams: Record<string, string | string[] | undefined>) {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const protocol = isLocalhost ? 'http' : (process.env.NODE_ENV === 'development' ? 'http' : 'https');

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) params.set(key, value[0]); // simplifying array params to string
    }

    // Default window if none provided to avoid errors
    if (!params.has('window')) params.set('window', '30d');
    if (!params.has('groupBy')) params.set('groupBy', 'utm_source');

    const url = `${protocol}://${host}/api/cockpit/metrics/acquisition?${params.toString()}`;

    try {
        const res = await fetch(url, {
            headers: {
                cookie: headersList.get('cookie') || '',
            },
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch acquisition metrics: ${res.status}`);
        }

        const data = await res.json();
        return { data: data.rows || [], totals: data.totals || null, meta: data.meta, error: false, requestId: res.headers.get('x-request-id') || 'unknown' };
    } catch (error) {
        console.error('Error fetching acquisition metrics:', error);
        return { data: [], totals: null, meta: { page: 1, limit: 20, total: 0, totalPages: 0 }, error: true, requestId: `local-${Date.now()}` };
    }
}

export default async function AcquisitionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolvedParams = await searchParams;
    const headersList = await headers();
    const role = (headersList.get('x-auth-role') || 'viewer') as Role;
    const tenantId = headersList.get('x-auth-tenant-id') || '';

    // Check plan status server-side
    let hasActivePlan = false;
    if (role === 'admin') {
        hasActivePlan = true;
    } else if (tenantId) {
        try {
            const db = await getDb();
            const results = await db.select({
                plan: tenants.plan
            }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);

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
                <div className="flex px-4 py-16 items-center justify-center min-h-[50vh]">
                    <div className="w-full max-w-md text-center border border-dashed rounded-[1.2rem] border-[hsl(var(--ui-border)/0.9)] bg-[hsl(var(--ui-surface))] shadow-[0_16px_50px_-24px_hsl(var(--ui-shadow)/0.55)] p-10">
                        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-text-muted))]">
                            <Lock className="h-6 w-6" />
                        </div>
                        {reason === 'plan' ? (
                            <>
                                <h2 className="mb-2 text-xl font-semibold tracking-tight text-[hsl(var(--ui-text))]">Plano necessário</h2>
                                <p className="text-sm text-[hsl(var(--ui-text-muted))] px-4 mb-2">
                                    Este recurso premium ajuda você a escalar sua operação. Faça upgrade para desbloquear.
                                </p>
                                <Link href="/billing/manage" className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors">
                                    Fazer Upgrade
                                </Link>
                            </>
                        ) : (
                            <>
                                <h2 className="mb-2 text-xl font-semibold tracking-tight text-[hsl(var(--ui-text))]">Sem permissão</h2>
                                <p className="text-sm text-[hsl(var(--ui-text-muted))] px-4">
                                    Seu usuário atual não possui papel (role) elevado para visualizar este conteúdo.
                                </p>
                                <div className="mt-6 inline-block rounded-lg bg-[hsl(var(--ui-muted))] px-4 py-2 text-sm font-medium text-[hsl(var(--ui-text-muted))]">
                                    Fale com o administrador
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const { data: rows, totals, meta, error, requestId } = await fetchAcquisitionData(resolvedParams);

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
                            initialError={error}
                            requestId={requestId}
                        />
                    </React.Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
