import { Metadata } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { SettingsPage, SettingsSection } from '@/ui/settings';
import { Button } from '@/ui/components';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { getInboxConversations } from '../../inbox/queries';
import { InboxListSkeleton } from '../../inbox/components/skeletons';
import { InboxEmptyState } from '../../inbox/components/empty-state';
import { ConversationRow } from '../../inbox/components/conversation-row';

export const metadata: Metadata = {
    title: 'Inbox — Operação',
    description: 'Fila operacional consolidada',
};

export default async function OperacaoInboxPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;
    const status = typeof searchParams.status === 'string' ? searchParams.status : 'all';
    const range = searchParams.range === '30d' ? 30 : 7;
    const cursor = typeof searchParams.cursor === 'string' ? searchParams.cursor : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');

    const actAsSuperAdmin = isSuperAdmin(role) && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    const paramsQuery = new URLSearchParams();
    if (inspectTenantId) paramsQuery.set('tenantId', inspectTenantId);
    if (status !== 'all') paramsQuery.set('status', status);
    if (range === 30) paramsQuery.set('range', '30d');
    const searchParamsStr = paramsQuery.toString();

    const allConvos = await getInboxConversations(tenantId, 999, undefined, { rangeDays: range });
    const counts = {
        open: allConvos.filter(c => c.status === 'open').length,
        pending: allConvos.filter(c => c.status === 'pending').length,
        closed: allConvos.filter(c => c.status === 'closed').length
    };

    return (
        <SettingsPage
            title="Inbox"
            description="Fila operacional consolidada"
        >
            <div className="flex flex-col gap-4 mb-6 px-4">
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex bg-[hsl(var(--ui-muted))] rounded-lg p-3 w-1/3 flex-col gap-1 items-center">
                        <span className="text-[hsl(var(--ui-text-muted))] uppercase font-semibold">Open</span>
                        <span className="text-xl font-bold text-[hsl(var(--ui-success))]">{counts.open}</span>
                    </div>
                    <div className="flex bg-[hsl(var(--ui-muted))] rounded-lg p-3 w-1/3 flex-col gap-1 items-center">
                        <span className="text-[hsl(var(--ui-text-muted))] uppercase font-semibold">Pending</span>
                        <span className="text-xl font-bold text-[hsl(var(--ui-warning))]">{counts.pending}</span>
                    </div>
                    <div className="flex bg-[hsl(var(--ui-muted))] rounded-lg p-3 w-1/3 flex-col gap-1 items-center">
                        <span className="text-[hsl(var(--ui-text-muted))] uppercase font-semibold">Closed</span>
                        <span className="text-xl font-bold text-[hsl(var(--ui-text))]">{counts.closed}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <span className="text-xs font-semibold text-[hsl(var(--ui-text-muted))] uppercase tracking-wider mr-2 shrink-0">Status:</span>
                    {['all', 'open', 'pending', 'closed'].map(s => (
                        <Link key={s} href={{ pathname: '/operacao/inbox', query: { tenantId: inspectTenantId, status: s, range: range === 30 ? '30d' : '7d' } }}>
                            <span className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer capitalize whitespace-nowrap ${status === s ? 'bg-[hsl(var(--ui-text))] text-[hsl(var(--ui-surface))] border-transparent font-medium' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                                {s}
                            </span>
                        </Link>
                    ))}

                    <span className="text-xs font-semibold text-[hsl(var(--ui-text-muted))] uppercase tracking-wider ml-4 mr-2 shrink-0">Range:</span>
                    <Link href={{ pathname: '/operacao/inbox', query: { tenantId: inspectTenantId, status, range: '7d' } }}>
                        <span className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer whitespace-nowrap ${range === 7 ? 'bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-accent-blue-ink))] border-transparent font-medium' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                            7 dias
                        </span>
                    </Link>
                    <Link href={{ pathname: '/operacao/inbox', query: { tenantId: inspectTenantId, status, range: '30d' } }}>
                        <span className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer whitespace-nowrap ${range === 30 ? 'bg-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-accent-blue-ink))] border-transparent font-medium' : 'bg-transparent text-[hsl(var(--ui-text))] border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-muted))]'}`}>
                            30 dias
                        </span>
                    </Link>
                </div>
            </div>

            <Suspense fallback={<InboxListSkeleton />} key={status + range + (cursor || '')}>
                <InboxContent
                    tenantId={tenantId}
                    inspectTenantId={inspectTenantId}
                    status={status}
                    range={range}
                    cursor={cursor}
                    searchParamsStr={searchParamsStr}
                />
            </Suspense>
        </SettingsPage>
    );
}

async function InboxContent({
    tenantId, inspectTenantId, status, range, cursor, searchParamsStr
}: {
    tenantId: string; inspectTenantId?: string; status: string;
    range: number; cursor?: string; searchParamsStr?: string;
}) {
    const items = await getInboxConversations(tenantId, 50, cursor, { status: status !== 'all' ? status : undefined, rangeDays: range });

    if (items.length === 0 && !cursor) {
        return <InboxEmptyState />;
    }

    const nextCursor = items.length === 50 ? items[49].convoId : undefined;

    return (
        <div className="flex flex-col gap-6">
            <SettingsSection title="Fila de Conversas">
                {items.map((item) => (
                    <ConversationRow key={item.convoId} item={item} searchParamsStr={searchParamsStr} />
                ))}
            </SettingsSection>

            {nextCursor && (
                <div className="flex justify-center px-4 mb-8">
                    <Link href={{ pathname: '/operacao/inbox', query: { tenantId: inspectTenantId, status, range: range === 30 ? '30d' : '7d', cursor: nextCursor } }}>
                        <Button variant="secondary" className="w-full max-w-sm rounded-full text-xs font-semibold hover:bg-[hsl(var(--ui-muted))] bg-transparent h-9 border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))]">
                            Avançar
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
