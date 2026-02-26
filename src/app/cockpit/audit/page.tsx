import React from 'react';
import { AuditTableClient } from './_components/AuditTableClient';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { headers } from 'next/headers';
import { canAccess, type Role } from '@/ui/auth/entitlements-logic';
import AccessDenied from '@/ui/components/AccessDenied';
import ServerErrorState from '@/ui/components/ServerErrorState';
import { serverFetchJson } from '@/ui/http/server-fetch';

export const dynamic = 'force-dynamic';

async function fetchAuditLogs(searchParams: Record<string, string | string[] | undefined>) {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = (host.startsWith('localhost') || host.startsWith('127.0.0.1')) ? 'http' : (process.env.NODE_ENV === 'development' ? 'http' : 'https');

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) params.set(key, value[0]);
    }

    const url = `${protocol}://${host}/api/cockpit/audit?${params.toString()}`;

    return serverFetchJson<any>(url, {
        headers: { cookie: headersList.get('cookie') || '' },
        cache: 'no-store'
    });
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolvedParams = await searchParams;
    const headersList = await headers();
    const role = (headersList.get('x-auth-role') || 'viewer') as Role;

    if (!canAccess('audit', { role, hasActivePlan: true })) {
        return (
            <div className="space-y-5 p-6 min-h-screen os-root">
                <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Audit Logs</h1>
                <AccessDenied />
            </div>
        );
    }

    const res = await fetchAuditLogs(resolvedParams);

    if (!res.ok) {
        return (
            <div className="space-y-5 p-6 min-h-screen os-root">
                <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Audit Logs</h1>
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

    const formattedData = rawEvents.map((event: any) => {
        let status: 'success' | 'failure' | 'pending' = 'success';
        if (event.payload?.status === 'failure' || event.payload?.error) status = 'failure';
        if (event.payload?.status === 'pending') status = 'pending';

        return {
            id: event.id,
            timestamp: event.createdAt,
            actor: event.tenantId || 'Sistema',
            action: event.type,
            resource: event.payload?.resource || 'N/A',
            status,
        };
    });

    return (
        <div className="space-y-5 p-6 min-h-screen os-root">
            <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">Audit Logs</h1>
            <p className="text-[hsl(var(--ui-text-muted))] mb-4">
                Visualização de auditoria utilizando a nova DataTable enterprise.
            </p>

            <Card variant="elevated">
                <CardHeader heading="Eventos do Sistema" subheading="Auditoria de ações em tempo real" />
                <CardContent className="pt-0 p-4 relative">
                    <React.Suspense fallback={
                        <div className="h-40 flex items-center justify-center text-[hsl(var(--ui-text-muted))]">
                            Carregando filtros...
                        </div>
                    }>
                        <AuditTableClient
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
