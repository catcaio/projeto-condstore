import { Suspense } from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { SettingsPage } from '@/ui/settings';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { getInboxItems } from './queries';
import { InboxList } from './components/inbox-list';
import { InboxListSkeleton } from './components/skeletons';
import { InboxEmptyState } from './components/empty-state';
import { Button } from '@/ui/components/button';

export const metadata = {
    title: 'Inbox — Condstore OS',
};

export default async function InboxPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;
    const filterKind = typeof searchParams.kind === 'string' ? searchParams.kind : undefined;
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
            title="Inbox"
            description="Timeline operacional unificada do tenant"
        >
            {/* Filtros simples (server-side nav) */}
            <div className="flex flex-wrap items-center gap-2 mb-6 px-4">
                <Link href={{ pathname: '/inbox', query: { tenantId: inspectTenantId, q: searchQuery } }}>
                    <span className={`text-xs px-3 py-1 rounded-full border ${!filterKind ? 'bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-accent-blue-ink))] border-transparent' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                        Tudo
                    </span>
                </Link>
                <Link href={{ pathname: '/inbox', query: { tenantId: inspectTenantId, kind: 'message', q: searchQuery } }}>
                    <span className={`text-xs px-3 py-1 rounded-full border ${filterKind === 'message' ? 'bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-accent-blue-ink))] border-transparent' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                        WhatsApp
                    </span>
                </Link>
                <Link href={{ pathname: '/inbox', query: { tenantId: inspectTenantId, kind: 'freight', q: searchQuery } }}>
                    <span className={`text-xs px-3 py-1 rounded-full border ${filterKind === 'freight' ? 'bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-accent-blue-ink))] border-transparent' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                        Frete & Funil
                    </span>
                </Link>
                <Link href={{ pathname: '/inbox', query: { tenantId: inspectTenantId, kind: 'event', q: searchQuery } }}>
                    <span className={`text-xs px-3 py-1 rounded-full border ${filterKind === 'event' ? 'bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-accent-blue-ink))] border-transparent' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                        Public Events
                    </span>
                </Link>
                <Link href={{ pathname: '/inbox', query: { tenantId: inspectTenantId, kind: 'webhook', q: searchQuery } }}>
                    <span className={`text-xs px-3 py-1 rounded-full border ${filterKind === 'webhook' ? 'bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-accent-blue-ink))] border-transparent' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                        Webhooks/System
                    </span>
                </Link>

                <form className="ml-auto flex items-center gap-2" action="/inbox" method="GET">
                    {inspectTenantId && <input type="hidden" name="tenantId" value={inspectTenantId} />}
                    {filterKind && <input type="hidden" name="kind" value={filterKind} />}
                    <input
                        type="text"
                        name="q"
                        defaultValue={searchQuery}
                        placeholder="Buscar..."
                        className="text-xs px-3 py-1 rounded border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] w-48 placeholder:text-[hsl(var(--ui-text-subtle))] focus:outline-none focus:border-[hsl(var(--ui-accent-blue))]"
                    />
                </form>
            </div>

            <Suspense fallback={<InboxListSkeleton />} key={filterKind + (searchQuery || '') + (cursor || '')}>
                <InboxContent
                    tenantId={tenantId}
                    inspectTenantId={inspectTenantId}
                    filterKind={filterKind}
                    searchQuery={searchQuery}
                    cursor={cursor}
                />
            </Suspense>
        </SettingsPage>
    );
}

async function InboxContent({
    tenantId,
    inspectTenantId,
    filterKind,
    searchQuery,
    cursor
}: {
    tenantId: string,
    inspectTenantId?: string,
    filterKind?: string,
    searchQuery?: string,
    cursor?: string
}) {
    const items = await getInboxItems(tenantId, 50, cursor, filterKind, searchQuery);

    if (items.length === 0 && !cursor) {
        return <InboxEmptyState />;
    }

    const nextCursor = items.length === 50 ? items[49].createdAt.toISOString() : undefined;

    return (
        <div className="flex flex-col gap-6">
            <InboxList items={items} />

            {nextCursor && (
                <div className="flex justify-center px-4 mb-8">
                    <Link href={{ pathname: '/inbox', query: { tenantId: inspectTenantId, kind: filterKind, q: searchQuery, cursor: nextCursor } }}>
                        <Button variant="secondary" className="w-full max-w-sm rounded-full text-xs font-semibold hover:bg-[hsl(var(--ui-muted))] bg-transparent h-9 border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))]">
                            Load more events
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
