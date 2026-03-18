import Link from 'next/link';
import { ArrowUpRight, MessageSquare, PackageSearch, Truck, Users } from 'lucide-react';
import { Button } from '@/ui/components';
import {
    ContentGrid,
    EntitySummaryCard,
    EventList,
    FilterBar,
    InfoPanel,
    KPIStrip,
    ModuleNav,
    PageHeader,
    SearchInput,
    SectionHeader,
    ShellContainer,
    SimpleDataTable,
    StatusChip,
    SurfacePanel,
} from '@/ui/foundation';
import {
    CockpitAlertsPanel,
    CockpitActionGrid,
    ActionQueue,
    OperationalEventFeed,
    OperationalKpiStrip,
    SystemStatusPanel,
} from '@/modules/cockpit';
import { getCockpitData } from '@/modules/cockpit/data/get-cockpit-data';
import { ClientsView } from '@/modules/clientes/clients-view';
import { ConversationsView } from '@/modules/conversas/conversations-view';
import { LogisticsView } from '@/modules/logistica/logistics-view';
import { OrdersView } from '@/modules/pedidos';
import { loadClientsHydrated } from '@/modules/clientes/customer.loader';
import { loadOrdersHydrated } from '@/modules/pedidos/server';
import { getServerSessionUser } from '@/infra/auth/session';

export type WorkspaceFoundationModuleId =
    | 'cockpit'
    | 'operacao'
    | 'conversas'
    | 'clientes'
    | 'pedidos'
    | 'logistica'
    | 'frank'
    | 'metricas'
    | 'tenant'
    | 'configuracoes';

export async function WorkspaceFoundationPage({ moduleId }: { moduleId: WorkspaceFoundationModuleId }) {
    const session = await getServerSessionUser();
    const tenantId = session?.tenantId || '550e8400-e29b-41d4-a716-446655440000'; // Fallback to seed for local dev if no session

    if (moduleId === 'cockpit') {
        return <CockpitFoundation />;
    }
    if (moduleId === 'operacao') {
        return <OperacaoFoundation />;
    }
    if (moduleId === 'conversas') {
        return <ConversationsView />;
    }
    if (moduleId === 'clientes') {
        const clients = await loadClientsHydrated(tenantId);
        return <ClientsView clients={clients} />;
    }
    if (moduleId === 'pedidos') {
        const orders = await loadOrdersHydrated(tenantId);
        return <OrdersView orders={orders} />;
    }
    if (moduleId === 'logistica') {
        return <LogisticsView />;
    }
    if (moduleId === 'frank') {
        return <FrankFoundation />;
    }
    if (moduleId === 'metricas') {
        return <MetricasFoundation />;
    }
    if (moduleId === 'tenant') {
        return <TenantFoundation />;
    }
    return <ConfiguracoesFoundation />;
}

function QuickLink({
    href,
    icon,
    title,
    description,
}: {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <Link href={href} className="block rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4 transition-colors hover:border-[hsl(var(--ui-border-strong))] hover:bg-[hsl(var(--ui-surface))]">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-2 text-[hsl(var(--ui-text-muted))]">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{title}</p>
                        <ArrowUpRight className="h-3.5 w-3.5 text-[hsl(var(--ui-text-subtle))]" />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{description}</p>
                </div>
            </div>
        </Link>
    );
}

function InfoLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text))]">{value}</p>
        </div>
    );
}

function StackCard({ title, subtitle, detail }: { title: string; subtitle: string; detail: string }) {
    return (
        <div className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
            <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{title}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{subtitle}</p>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{detail}</p>
        </div>
    );
}

async function CockpitFoundation() {
    const cockpitData = await getCockpitData();
    const cockpitConversationShortcut = cockpitData.shortcuts.find((shortcut) => shortcut.id === 'open-conversations');
    const cockpitSimulationShortcut = cockpitData.shortcuts.find((shortcut) => shortcut.id === 'new-simulation');
    const hasPartialFallback = cockpitData.meta.partialBlocks.length > 0;

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Cockpit"
                title="Cockpit operacional vivo"
                description="Centro de comando da operacao com leitura imediata de estado, gargalos, eventos e proximas acoes. Sem BI decorativo e sem esconder a fila real atras de graficos genericos."
                meta={
                    <>
                        <StatusChip label="operacao viva" tone="success" />
                        <StatusChip label="alertas acionaveis" tone="warning" />
                        <StatusChip
                            label={cockpitData.meta.source === 'real' ? 'dados operacionais reais' : 'fallback temporario'}
                            tone={cockpitData.meta.source === 'real' ? 'info' : 'critical'}
                        />
                        {hasPartialFallback ? (
                            <StatusChip label={`fallback parcial ${cockpitData.meta.partialBlocks.length}`} tone="warning" />
                        ) : null}
                    </>
                }
                actions={
                    <>
                        <Link href={cockpitConversationShortcut?.href ?? '/conversas'}>
                            <Button variant="secondary">Abrir conversas</Button>
                        </Link>
                        <Link href={cockpitSimulationShortcut?.href ?? '/logistica/simulador'}>
                            <Button>Nova simulacao</Button>
                        </Link>
                    </>
                }
            />

            <ModuleNav
                items={[
                    { label: 'KPI strip', current: true, detail: 'Pulso rapido da operacao' },
                    { label: 'Alertas', detail: 'Problemas acionaveis agora' },
                    { label: 'Feed', detail: 'Quase tempo real' },
                    { label: 'Filas e saude', detail: 'Acao e status de plataforma' },
                ]}
            />

            <OperationalKpiStrip items={cockpitData.metrics} />
            <CockpitAlertsPanel alerts={cockpitData.alerts} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <OperationalEventFeed events={cockpitData.events} />
                <ActionQueue items={cockpitData.queue} />
            </div>

            <SystemStatusPanel items={cockpitData.systemStatus} />
            <CockpitActionGrid shortcuts={cockpitData.shortcuts} />
        </ShellContainer>
    );
}

function SystemEmptyState({
    eyebrow,
    title,
    description,
    ctaLabel,
    ctaHref,
}: {
    eyebrow: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
}) {
    return (
        <ShellContainer>
            <PageHeader eyebrow={eyebrow} title={title} description={description} />
            <div className="mt-8 flex h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-page))] text-center">
                <div className="mb-4 rounded-full bg-[hsl(var(--ui-surface))] p-4">
                    <PackageSearch className="h-8 w-8 text-[hsl(var(--ui-text-muted))]" />
                </div>
                <h3 className="text-lg font-medium text-[hsl(var(--ui-text))]">Configuracao Operacional Pendente</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-[hsl(var(--ui-text-muted))]">
                    Este modulo ainda nao possui mapeamento direto para a operacao viva Lojacond.
                </p>
                <div className="mt-6">
                    <Link href={ctaHref}>
                        <Button>{ctaLabel}</Button>
                    </Link>
                </div>
            </div>
        </ShellContainer>
    );
}

function OperacaoFoundation() {
    return (
        <SystemEmptyState
            eyebrow="Operacao"
            title="SLA e Capacidade Operacional"
            description="Visao gerencial de alocacao e performance do turno."
            ctaLabel="Abrir fila de atendimento"
            ctaHref="/conversas"
        />
    );
}

function FrankFoundation() {
    return (
        <SystemEmptyState
            eyebrow="Frank"
            title="Dashboard de Inteligencia"
            description="O painel analitico do Frank sera ativado no estagio de maturidade."
            ctaLabel="Voltar ao Cockpit"
            ctaHref="/"
        />
    );
}

function MetricasFoundation() {
    return (
        <SystemEmptyState
            eyebrow="Metricas"
            title="Atribuicao e Desempenho"
            description="Leitura executiva do funil comercial."
            ctaLabel="Ver atribuicao legada"
            ctaHref="/attribution"
        />
    );
}

function TenantFoundation() {
    return (
        <SystemEmptyState
            eyebrow="Tenant"
            title="Governanca Operacional"
            description="Configuracoes de infraestrutura e tenant abstracts."
            ctaLabel="Voltar ao Cockpit"
            ctaHref="/"
        />
    );
}

function ConfiguracoesFoundation() {
    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Configuracoes"
                title="Workspace e Integracoes"
                description="Controle de acesso e modulos da Lojacond."
            />
            <div className="mt-8 flex h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-page))] text-center">
                <div className="mb-4 rounded-full bg-[hsl(var(--ui-surface))] p-4">
                    <Users className="h-8 w-8 text-[hsl(var(--ui-text-muted))]" />
                </div>
                <h3 className="text-lg font-medium text-[hsl(var(--ui-text))]">Acesso Tecnico Requerido</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-[hsl(var(--ui-text-muted))]">
                    A governanca de perfil de operador Lojacond e gerenciada externamente no momento.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link href="/">
                        <Button variant="secondary">Voltar ao Cockpit</Button>
                    </Link>
                    <Link href="/settings">
                        <Button>Configuracoes avancadas</Button>
                    </Link>
                </div>
            </div>
        </ShellContainer>
    );
}
