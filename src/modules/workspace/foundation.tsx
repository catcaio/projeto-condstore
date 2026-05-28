import Link from 'next/link';
import { headers } from 'next/headers';
import { PackageSearch } from 'lucide-react';
import { Button } from '@/ui/components';
import {
    AlertBlock,
    ContentGrid,
    EntitySummaryCard,
    InfoPanel,
    ModuleNav,
    PageHeader,
    SectionHeader,
    ShellContainer,
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
import { getEnvironmentInfo, getIntegrationsStatus, getTenantBasics } from '@/app/(app)/settings/queries';

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

type WorkspaceRuntimeContext = {
    tenantId: string;
    role: string;
    requestId: string;
};

async function getWorkspaceRuntimeContext(): Promise<WorkspaceRuntimeContext | null> {
    const [session, headerList] = await Promise.all([
        getServerSessionUser(),
        headers(),
    ]);

    const tenantId = session?.tenantId ?? headerList.get('x-auth-tenant-id');

    if (!tenantId) {
        return null;
    }

    return {
        tenantId,
        role: session?.role ?? headerList.get('x-auth-role') ?? 'viewer',
        requestId: headerList.get('x-request-id') ?? 'request-id-unavailable',
    };
}

export async function WorkspaceFoundationPage({ moduleId }: { moduleId: WorkspaceFoundationModuleId }) {
    const context = await getWorkspaceRuntimeContext();

    if (!context) {
        return (
            <WorkspaceDiagnosticState
                eyebrow="Auth"
                title="Sessao operacional nao encontrada"
                description="A area autenticada precisa de tenant resolvido pela sessao. Nenhum tenantId foi inferido de fallback ou seed."
                requestId="request-id-unavailable"
                ctaLabel="Ir para login"
                ctaHref="/login"
            />
        );
    }

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
        try {
            const clients = await loadClientsHydrated(context.tenantId);
            return <ClientsView clients={clients} />;
        } catch {
            return (
                <WorkspaceDiagnosticState
                    eyebrow="Clientes"
                    title="Clientes indisponiveis"
                    description="A leitura do CRM falhou. A falha nao foi mascarada com placeholder; use o requestId para rastrear o erro nos logs."
                    requestId={context.requestId}
                    ctaLabel="Voltar ao Cockpit"
                    ctaHref="/cockpit"
                />
            );
        }
    }
    if (moduleId === 'pedidos') {
        try {
            const orders = await loadOrdersHydrated(context.tenantId);
            return <OrdersView orders={orders} />;
        } catch {
            return (
                <WorkspaceDiagnosticState
                    eyebrow="Pedidos"
                    title="Pedidos indisponiveis"
                    description="A leitura de pedidos falhou. A tela permanece bloqueada com requestId em vez de exibir dados ficticios."
                    requestId={context.requestId}
                    ctaLabel="Voltar ao Cockpit"
                    ctaHref="/cockpit"
                />
            );
        }
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
        return <TenantFoundation context={context} />;
    }
    return <ConfiguracoesFoundation context={context} />;
}

function InfoLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text))]">{value}</p>
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

            {cockpitData.meta.source !== 'real' ? (
                <AlertBlock
                    tone="critical"
                    title="Modo Fallback Ativo (Diagnostico)"
                    description={`source=fallback | fallbackReason=${cockpitData.meta.fallbackReason ?? 'none'} | partialBlocks=[${cockpitData.meta.partialBlocks.join(', ')}]`}
                />
            ) : null}

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

function WorkspaceDiagnosticState({
    eyebrow,
    title,
    description,
    requestId,
    ctaLabel,
    ctaHref,
}: {
    eyebrow: string;
    title: string;
    description: string;
    requestId: string;
    ctaLabel: string;
    ctaHref: string;
}) {
    return (
        <ShellContainer>
            <PageHeader eyebrow={eyebrow} title={title} description={description} />
            <div className="mt-8 flex min-h-[24rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-page))] px-6 text-center">
                <div className="mb-4 rounded-full bg-[hsl(var(--ui-surface))] p-4">
                    <PackageSearch className="h-8 w-8 text-[hsl(var(--ui-text-muted))]" />
                </div>
                <h3 className="text-lg font-medium text-[hsl(var(--ui-text))]">Estado operacional rastreavel</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-[hsl(var(--ui-text-muted))]">
                    requestId={requestId}
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

function SystemChecklistState({
    eyebrow,
    title,
    description,
    ctaLabel,
    ctaHref,
    items,
}: {
    eyebrow: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    items: string[];
}) {
    return (
        <ShellContainer>
            <PageHeader eyebrow={eyebrow} title={title} description={description} />
            <SurfacePanel>
                <SectionHeader
                    title="Checklist operacional"
                    description="Estado honesto para piloto: nao ha dado ficticio; a tela mostra o que falta conectar ou verificar."
                    actions={
                        <Link href={ctaHref}>
                            <Button>{ctaLabel}</Button>
                        </Link>
                    }
                />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {items.map((item) => (
                        <div key={item} className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-4 py-3 text-sm text-[hsl(var(--ui-text-muted))]">
                            {item}
                        </div>
                    ))}
                </div>
            </SurfacePanel>
        </ShellContainer>
    );
}

async function OperacaoFoundation() {
    const cockpitData = await getCockpitData();

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Operacao"
                title="Status operacional supervisionado"
                description="Leitura de filas, infraestrutura e proximos passos para o turno do piloto."
                meta={
                    <>
                        <StatusChip
                            label={cockpitData.meta.source === 'real' ? 'dados reais' : 'fallback diagnostico'}
                            tone={cockpitData.meta.source === 'real' ? 'success' : 'warning'}
                        />
                        <StatusChip label={`filas ${cockpitData.queue.length}`} tone="info" />
                    </>
                }
            />
            {cockpitData.meta.source !== 'real' ? (
                <AlertBlock
                    tone="warning"
                    title="Diagnostico pendente"
                    description={`source=${cockpitData.meta.source}; fallbackReason=${cockpitData.meta.fallbackReason ?? 'none'}`}
                />
            ) : null}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <ActionQueue items={cockpitData.queue} />
                <SystemStatusPanel items={cockpitData.systemStatus} />
            </div>
            <InfoPanel title="Proximos passos operacionais">
                <InfoLine label="Twilio" value="Validar inbound/outbound no status do cockpit antes do piloto." />
                <InfoLine label="Banco e Redis" value="Conferir status infra e requestId em qualquer degradacao." />
                <InfoLine label="Melhor Envio" value="Usar cotacao supervisionada; pendencias devem aparecer como checklist, nao como sucesso falso." />
            </InfoPanel>
        </ShellContainer>
    );
}

function FrankFoundation() {
    return (
        <SystemChecklistState
            eyebrow="Frank"
            title="Dashboard de Inteligencia"
            description="O painel analitico do Frank sera ativado no estagio de maturidade."
            ctaLabel="Voltar ao Cockpit"
            ctaHref="/cockpit"
            items={[
                'Frank permanece supervisionado: sem acao autonoma irreversivel.',
                'Acoes operacionais continuam exigindo gate humano.',
            ]}
        />
    );
}

async function MetricasFoundation() {
    const cockpitData = await getCockpitData();

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Metricas"
                title="Metricas minimas do piloto"
                description="Tempo de resposta, pedidos, cotacoes e excecoes lidos a partir do cockpit operacional."
                meta={
                    <>
                        <StatusChip
                            label={cockpitData.meta.source === 'real' ? 'dados reais' : 'fallback diagnostico'}
                            tone={cockpitData.meta.source === 'real' ? 'success' : 'warning'}
                        />
                        <StatusChip label={`partial ${cockpitData.meta.partialBlocks.length}`} tone={cockpitData.meta.partialBlocks.length > 0 ? 'warning' : 'success'} />
                    </>
                }
            />
            {cockpitData.meta.source !== 'real' ? (
                <AlertBlock
                    tone="warning"
                    title="Origem de dados incompleta"
                    description={`source=${cockpitData.meta.source}; fallbackReason=${cockpitData.meta.fallbackReason ?? 'none'}; partialBlocks=[${cockpitData.meta.partialBlocks.join(', ')}]`}
                />
            ) : null}
            <OperationalKpiStrip items={cockpitData.metrics} />
            <ContentGrid
                main={<OperationalEventFeed events={cockpitData.events} />}
                side={
                    <InfoPanel title="Checklist de leitura">
                        <InfoLine label="Tempo de resposta" value="Derivado da fila de conversas e mensagens recentes." />
                        <InfoLine label="Cotacao -> pedido" value="Conferir cotacoes, pedidos em processamento e eventos recentes." />
                        <InfoLine label="Handoffs" value="Conversas sem resposta aparecem na fila de acao." />
                    </InfoPanel>
                }
            />
        </ShellContainer>
    );
}

async function TenantFoundation({ context }: { context: WorkspaceRuntimeContext }) {
    try {
        const tenant = await getTenantBasics(context.tenantId);
        const env = getEnvironmentInfo();

        return (
            <ShellContainer>
                <PageHeader
                    eyebrow="Tenant"
                    title="Tenant e workspace"
                    description="Identidade do tenant, plano e ambiente resolvidos pela sessao autenticada."
                    meta={<StatusChip label={tenant ? 'tenant encontrado' : 'tenant pendente'} tone={tenant ? 'success' : 'warning'} />}
                />
                <EntitySummaryCard
                    title={tenant?.name ?? 'Tenant nao localizado'}
                    subtitle={context.tenantId}
                    status={{ label: tenant?.planStatus ?? 'pendente', tone: tenant ? 'info' : 'warning' }}
                    fields={[
                        { label: 'Role atual', value: context.role },
                        { label: 'Plano', value: tenant?.plan ?? 'nao configurado' },
                        { label: 'Ambiente', value: env.env },
                        { label: 'Dominio', value: env.domain },
                    ]}
                />
            </ShellContainer>
        );
    } catch {
        return (
            <WorkspaceDiagnosticState
                eyebrow="Tenant"
                title="Tenant indisponivel"
                description="A consulta do tenant falhou. A tela manteve estado rastreavel sem inferir dados."
                requestId={context.requestId}
                ctaLabel="Voltar ao Cockpit"
                ctaHref="/cockpit"
            />
        );
    }
}

async function ConfiguracoesFoundation({ context }: { context: WorkspaceRuntimeContext }) {
    const environment = getEnvironmentInfo();
    const [tenantResult, integrationsResult] = await Promise.allSettled([
        getTenantBasics(context.tenantId),
        getIntegrationsStatus(context.tenantId),
    ]);
    const tenant = tenantResult.status === 'fulfilled' ? tenantResult.value : null;
    const integrations = integrationsResult.status === 'fulfilled' ? integrationsResult.value : null;

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Configuracoes"
                title="Workspace, ambiente e integracoes"
                description="Painel operacional da configuracao minima do piloto. Falhas aparecem como pendencia rastreavel."
                meta={
                    <>
                        <StatusChip label={tenant ? 'workspace real' : 'workspace pendente'} tone={tenant ? 'success' : 'warning'} />
                        <StatusChip label={integrations ? 'integracoes lidas' : 'integracoes pendentes'} tone={integrations ? 'info' : 'warning'} />
                    </>
                }
            />
            <ContentGrid
                main={
                    <>
                        <EntitySummaryCard
                            title={tenant?.name ?? 'Workspace pendente'}
                            subtitle={context.tenantId}
                            status={{ label: tenant?.planStatus ?? 'pendente', tone: tenant ? 'info' : 'warning' }}
                            fields={[
                                { label: 'Plano', value: tenant?.plan ?? 'nao configurado' },
                                { label: 'Role atual', value: context.role },
                                { label: 'Criado em', value: tenant?.createdAt ? tenant.createdAt.toISOString() : 'indisponivel' },
                                { label: 'RequestId', value: context.requestId },
                            ]}
                        />
                        <SurfacePanel>
                            <SectionHeader title="Integracoes essenciais" description="Status operacional lido quando disponivel; pendencias nao sao tratadas como sucesso." />
                            <div className="mt-5 grid gap-3 md:grid-cols-2">
                                <InfoLine label="Stripe" value={integrations?.stripe ?? 'pendente'} />
                                <InfoLine label="WhatsApp/Twilio" value={integrations?.whatsapp ? 'configurado' : 'pendente'} />
                                <InfoLine label="AI providers" value={integrations ? String(integrations.aiProviders) : 'pendente'} />
                                <InfoLine label="Banco e Redis" value={integrations ? `${integrations.dbOk ? 'db ok' : 'db pendente'} / ${integrations.redisOk ? 'redis ok' : 'redis pendente'}` : 'pendente'} />
                            </div>
                        </SurfacePanel>
                    </>
                }
                side={
                    <InfoPanel title="Ambiente">
                        <InfoLine label="Dominio" value={environment.domain} />
                        <InfoLine label="Ambiente" value={environment.env} />
                        <InfoLine label="SHA" value={environment.gitSha?.slice(0, 12) || 'local'} />
                        <InfoLine label="Node" value={environment.nodeEnv ?? 'nao informado'} />
                    </InfoPanel>
                }
            />
        </ShellContainer>
    );
}
