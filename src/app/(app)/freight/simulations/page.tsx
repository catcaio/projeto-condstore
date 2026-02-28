import { Suspense } from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { SettingsPage, SettingsSection } from '@/ui/settings';
import { Button } from '@/ui/components';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { listSimulations } from './queries';
import { SimulationsListSkeleton } from './components/skeletons';
import { SimulationsEmptyState } from './components/empty-state';
import { SimulationRow } from './components/simulation-row';

export const metadata = {
    title: 'Simulações de Frete — Condstore OS',
};

export default async function FreightSimulationsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;
    const searchQuery = typeof searchParams.q === 'string' ? searchParams.q : undefined;
    const cursor = typeof searchParams.cursor === 'string' ? searchParams.cursor : undefined;

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
            title="Simulações de Frete"
            description="Histórico de cotações processadas"
        >
            <div className="flex items-center justify-between gap-4 mb-6 px-4">
                <form className="flex-1 w-full max-w-sm flex items-center gap-2" action="/freight/simulations" method="GET">
                    {inspectTenantId && <input type="hidden" name="tenantId" value={inspectTenantId} />}
                    <input
                        type="text"
                        name="q"
                        defaultValue={searchQuery}
                        placeholder="Buscar por UF..."
                        className="text-xs px-3 py-1 rounded border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] w-full placeholder:text-[hsl(var(--ui-text-subtle))] focus:outline-none focus:border-[hsl(var(--ui-accent-blue))]"
                    />
                    <Button type="submit" variant="secondary" className="h-7 text-xs px-3">
                        Filtrar
                    </Button>
                </form>
            </div>

            <Suspense fallback={<SimulationsListSkeleton />} key={(searchQuery || '') + (cursor || '')}>
                <SimulationsContent
                    tenantId={tenantId}
                    inspectTenantId={inspectTenantId}
                    searchQuery={searchQuery}
                    cursor={cursor}
                />
            </Suspense>
        </SettingsPage>
    );
}

async function SimulationsContent({
    tenantId,
    inspectTenantId,
    searchQuery,
    cursor
}: {
    tenantId: string,
    inspectTenantId?: string,
    searchQuery?: string,
    cursor?: string
}) {
    const items = await listSimulations(tenantId, 50, cursor, searchQuery);

    if (items.length === 0 && !cursor) {
        return <SimulationsEmptyState />;
    }

    const nextCursor = items.length === 50 ? items[49].createdAt.toISOString() : undefined;

    return (
        <div className="flex flex-col gap-6">
            <SettingsSection title="Simulações Registradas">
                {items.map((item) => (
                    <SimulationRow key={item.id} item={item} inspectTenantId={inspectTenantId} />
                ))}
            </SettingsSection>

            {nextCursor && (
                <div className="flex justify-center px-4 mb-8">
                    <Link href={{ pathname: '/freight/simulations', query: { tenantId: inspectTenantId, q: searchQuery, cursor: nextCursor } }}>
                        <Button variant="secondary" className="w-full max-w-sm rounded-full text-xs font-semibold hover:bg-[hsl(var(--ui-muted))] bg-transparent h-9 border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))]">
                            Load more
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
