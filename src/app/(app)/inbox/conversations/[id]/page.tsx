import { Suspense } from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { SettingsPage, SettingsSection, SettingsRow } from '@/ui/settings';
import { Button } from '@/ui/components';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { getConversationHeader, getConversationTimeline } from './queries';
import { ConversationTimelineSkeleton, ConversationHeaderSkeleton } from './components/skeletons';
import { ConversationTimeline } from './components/conversation-timeline';
import { ChevronLeft, Info, Fingerprint, CalendarDays, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const metadata = {
    title: 'Detalhes da Conversa — Condstore OS',
};

export default async function ConversationDetailPage(props: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    // Preserve inbox filters in the back button URL
    const backQuery: Record<string, string> = {};
    if (inspectTenantId) backQuery.tenantId = inspectTenantId;
    if (typeof searchParams.q === 'string') backQuery.q = searchParams.q;
    if (typeof searchParams.filter === 'string') backQuery.filter = searchParams.filter;
    if (typeof searchParams.cursor === 'string') backQuery.cursor = searchParams.cursor;

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
            title="Thread Log"
            description="Visão consolidada read-only de eventos correlacionados."
        >
            <div className="mb-6 px-4">
                <Link href={{ pathname: '/inbox', query: backQuery }}>
                    <Button variant="ghost" className="text-xs text-[hsl(var(--ui-text-muted))] h-8 pl-1 pr-3 -ml-2 rounded-full hover:bg-[hsl(var(--ui-muted))]">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to Inbox
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="md:col-span-2 flex flex-col gap-6">
                    <Suspense fallback={<ConversationHeaderSkeleton />}>
                        <HeaderContent tenantId={tenantId} id={params.id} />
                    </Suspense>

                    <Suspense fallback={<ConversationTimelineSkeleton />}>
                        <TimelineContent tenantId={tenantId} id={params.id} />
                    </Suspense>
                </div>

                <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-[hsl(var(--ui-border))] pt-6 md:pt-0 md:pl-6">
                    <Suspense fallback={<div className="animate-pulse h-64 bg-[hsl(var(--ui-muted))] rounded-md" />}>
                        <ContextSidebar tenantId={tenantId} id={params.id} inspectTenantId={inspectTenantId} />
                    </Suspense>
                </div>
            </div>
        </SettingsPage>
    );
}

async function HeaderContent({ tenantId, id }: { tenantId: string, id: string }) {
    const header = await getConversationHeader(tenantId, id);

    return (
        <div className="flex flex-col gap-1 px-4 mb-2">
            <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                {header.title}
            </h2>
            <p className="text-sm font-medium text-[hsl(var(--ui-text-muted))]">
                {header.subtitle}
            </p>
        </div>
    );
}

async function TimelineContent({ tenantId, id }: { tenantId: string, id: string }) {
    const items = await getConversationTimeline(tenantId, id);
    return <ConversationTimeline items={items} />;
}

async function ContextSidebar({ tenantId, id, inspectTenantId }: { tenantId: string, id: string, inspectTenantId?: string }) {
    const header = await getConversationHeader(tenantId, id);

    let rangeStr = '--';
    if (header.firstAt && header.lastAt) {
        const dF = format(header.firstAt, 'dd/MM/yy', { locale: ptBR });
        const dL = format(header.lastAt, 'dd/MM/yy', { locale: ptBR });
        rangeStr = dF === dL ? dF : `${dF} - ${dL}`;
    }

    return (
        <div className="flex flex-col gap-6">
            <SettingsSection title="Context (lite)">
                <SettingsRow
                    icon={<CalendarDays className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />}
                    label="Primeiro - Último"
                    value={rangeStr}
                />
                <SettingsRow
                    icon={<Fingerprint className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />}
                    label="Identifiers"
                    description="O que baseou essa busca"
                    value={
                        <div className="flex flex-col gap-1 text-right text-xs">
                            {header.contactKey && <span className="font-mono">{header.contactKey}</span>}
                            {header.refToken && <span className="font-mono text-[10px] break-all max-w-[120px]">{header.refToken}</span>}
                            {!header.contactKey && !header.refToken && <span>Row ID Original Base</span>}
                        </div>
                    }
                />
            </SettingsSection>

            {header.utm && (
                <SettingsSection title="Attribution Orgânica">
                    {header.utm.source && <SettingsRow label="Source" value={header.utm.source} />}
                    {header.utm.campaign && <SettingsRow label="Campaign" value={header.utm.campaign} />}
                </SettingsSection>
            )}

            {header.refToken && (
                <div className="px-4">
                    <Link href={{ pathname: '/freight/simulations', query: { tenantId: inspectTenantId, q: header.refToken } }}>
                        <Button variant="secondary" className="w-full text-xs hover:bg-[hsl(var(--ui-muted))] border border-[hsl(var(--ui-border))] rounded-full">
                            Ver Simulações
                            <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
