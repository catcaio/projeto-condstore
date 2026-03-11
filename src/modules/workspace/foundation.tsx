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
import { CockpitAlertsPanel } from '@/modules/cockpit/components/alerts-panel';
import { CockpitActionGrid } from '@/modules/cockpit/components/action-grid';
import { ActionQueue } from '@/modules/cockpit/components/action-queue';
import { OperationalEventFeed } from '@/modules/cockpit/components/event-feed';
import { OperationalKpiStrip } from '@/modules/cockpit/components/kpi-strip';
import { getCockpitData } from '@/modules/cockpit/data/get-cockpit-data';
import { ClientsView } from '@/modules/clientes/clients-view';
import { ConversationsView } from '@/modules/conversas/conversations-view';
import { LogisticsView } from '@/modules/logistica/logistics-view';
import { OrdersView } from '@/modules/pedidos/orders-view';
import { SystemStatusPanel } from '@/modules/cockpit/components/system-status';
import { loadMockClientsHydrated } from '@/modules/clientes/customer.loader';
import { loadMockOrdersHydrated } from '@/modules/pedidos/order.loader';

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
        const clients = await loadMockClientsHydrated('550e8400-e29b-41d4-a716-446655440000'); // the default seed tenant
        return <ClientsView clients={clients} />;
    }
    if (moduleId === 'pedidos') {
        const orders = await loadMockOrdersHydrated('550e8400-e29b-41d4-a716-446655440000'); // the default seed tenant
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

function OperacaoFoundation() {
    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Operacao"
                title="Orquestracao de fila, capacidade e risco"
                description="Fundacao da camada operacional para monitorar backlog, alocacao humana e excecoes entre atendimento, pedidos e logistica."
                meta={
                    <>
                        <StatusChip label="SLA em observacao" tone="warning" />
                        <StatusChip label="10 squads conectados" tone="neutral" />
                    </>
                }
            />
            <ModuleNav
                items={[
                    { label: 'Fila', current: true, detail: 'Backlog e aging' },
                    { label: 'Capacidade', detail: 'Times, ownership e handoff' },
                    { label: 'Risco', detail: 'Pontos de escalonamento' },
                    { label: 'Playbooks', detail: 'Resposta operacional' },
                ]}
            />
            <KPIStrip
                items={[
                    { label: 'Tickets em aging critico', value: '19', helper: 'Casos acima da janela aceitavel para primeira resposta.', tone: 'danger' },
                    { label: 'Capacidade alocada', value: '87%', helper: 'Turno atual com times quase no limite operacional.', tone: 'warning' },
                    { label: 'Resolucao no turno', value: '74%', helper: 'Tickets encerrados sem escalonamento para camada tecnica.', tone: 'success' },
                    { label: 'Handovers pendentes', value: '8', helper: 'Mudancas de ownership aguardando confirmacao.', tone: 'info' },
                ]}
            />
            <ContentGrid
                main={
                    <>
                        <SurfacePanel>
                            <SectionHeader title="Fila operacional" description="Visao base da operacao macro por tipo de trabalho." />
                            <div className="mt-4">
                                <SimpleDataTable
                                    columns={[
                                        { key: 'fila', label: 'Fila' },
                                        { key: 'volume', label: 'Volume', align: 'right' },
                                        { key: 'aging', label: 'Aging medio', align: 'right' },
                                        { key: 'owner', label: 'Owner' },
                                    ]}
                                    rows={[
                                        { fila: 'Conversas comerciais', volume: '62', aging: '21 min', owner: 'CX Ops' },
                                        { fila: 'Pedidos com pendencia', volume: '31', aging: '46 min', owner: 'Sales Ops' },
                                        { fila: 'Excecoes logisticas', volume: '17', aging: '1h 12m', owner: 'Freight Ops' },
                                        { fila: 'Governanca e permissoes', volume: '6', aging: '3h 08m', owner: 'Admin Ops' },
                                    ]}
                                />
                            </div>
                        </SurfacePanel>

                        <SurfacePanel>
                            <SectionHeader title="Capacidade e resposta" description="Estrutura inicial para squads, ownership e redistribuicao." />
                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                <StackCard title="Atendimento" subtitle="12 operadores ativos" detail="Macro, triagem e contexto lateral centralizados em uma unica fila." />
                                <StackCard title="Sales Ops" subtitle="4 analistas em pedidos" detail="Bloqueios, aprovacoes comerciais e handoffs para logistica." />
                                <StackCard title="Freight Ops" subtitle="3 analistas de excecao" detail="Regras, simulacoes e contingencias de transportadora." />
                            </div>
                        </SurfacePanel>
                    </>
                }
                side={
                    <>
                        <InfoPanel title="Pontos de escalonamento">
                            <InfoLine label="Critico" value="Pedidos com prazo rompido e cliente premium." />
                            <InfoLine label="Alto" value="Conversa reaberta apos encerramento recente." />
                            <InfoLine label="Moderado" value="Fila acima da capacidade planejada por 30 min." />
                        </InfoPanel>
                        <InfoPanel title="Playbooks estruturados">
                            <QuickLink href="/conversas" icon={<MessageSquare className="h-4 w-4" />} title="Atendimento" description="Triagem, contexto e macros operacionais." />
                            <QuickLink href="/pedidos" icon={<PackageSearch className="h-4 w-4" />} title="Pedidos" description="Fluxo do pedido com checkpoints visiveis." />
                        </InfoPanel>
                    </>
                }
            />
        </ShellContainer>
    );
}

function FrankFoundation() {
    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Frank"
                title="Supervisor de inteligencia operacional"
                description="Pagina foundation do agente com leitura de intencoes, desempenho, logs e acoes futuras sem inventar automacao que ainda nao existe."
                meta={
                    <>
                        <StatusChip label="assistive mode" tone="info" />
                        <StatusChip label="guardrails ativos" tone="success" />
                    </>
                }
            />
            <ModuleNav
                items={[
                    { label: 'Overview', current: true, detail: 'Estado geral do agente' },
                    { label: 'Intencoes', detail: 'Tipos de recomendacao' },
                    { label: 'Desempenho', detail: 'Latencia e acuracia operacional' },
                    { label: 'Logs', detail: 'Acoes e rastreabilidade' },
                ]}
            />
            <KPIStrip
                items={[
                    { label: 'Sugestoes emitidas', value: '84', helper: 'Recomendacoes operacionais nas ultimas 24h.', tone: 'info' },
                    { label: 'Aprovadas', value: '63', helper: 'Sugestoes aceitas por operador ou gestor.', tone: 'success' },
                    { label: 'Rejeitadas', value: '9', helper: 'Casos barrados por contexto ou governanca.', tone: 'warning' },
                    { label: 'Rollback necessario', value: '1', helper: 'Uma acao reversivel aguardando revisao.', tone: 'danger' },
                ]}
            />
            <ContentGrid
                main={
                    <>
                        <SurfacePanel>
                            <SectionHeader title="Mapa de intencoes" description="Categorias iniciais de trabalho do agente." />
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <StackCard title="Atendimento" subtitle="Sugestao de resposta" detail="Macro, contexto lateral, urgencia e proxima melhor acao." />
                                <StackCard title="Pedidos" subtitle="Priorizacao e bloqueio" detail="Leitura de aging, handoff e risco de promessa." />
                                <StackCard title="Logistica" subtitle="Contingencia e regra" detail="Comparacao de cenario, margem e excecao." />
                                <StackCard title="Governanca" subtitle="Permissao e auditoria" detail="Alertas de risco e mudanca estrutural no tenant." />
                            </div>
                        </SurfacePanel>
                        <SurfacePanel>
                            <SectionHeader title="Logs e acoes placeholder" description="Trilha estruturada para auditar sugestoes e execucoes." />
                            <div className="mt-4">
                                <EventList
                                    items={[
                                        { title: 'Recomendacao de contingencia gerada', time: '09:14', detail: 'Frank sugeriu trocar transportadora em 42 pedidos por risco de SLA.', tone: 'info' },
                                        { title: 'Sugestao de macro aprovada', time: '08:42', detail: 'Operador aprovou resposta assistida para cliente premium com atraso.', tone: 'success' },
                                        { title: 'Acao bloqueada por permissao', time: '08:08', detail: 'Alteracao de politica de margem exigia aprovacao de admin.', tone: 'danger' },
                                    ]}
                                />
                            </div>
                        </SurfacePanel>
                    </>
                }
                side={
                    <>
                        <InfoPanel title="Desempenho">
                            <InfoLine label="Latencia media" value="1.8s por sugestao contextual" />
                            <InfoLine label="Precisao percebida" value="82% em revisao humana" />
                            <InfoLine label="Modo de atuacao" value="Assistido, nunca autonomo por padrao" />
                        </InfoPanel>
                        <InfoPanel title="Guardrails">
                            <InfoLine label="Politica" value="Sem execucao irrestrita em tenant" />
                            <InfoLine label="Aprovacao" value="Admin ou gestor para mudancas sensiveis" />
                            <InfoLine label="Auditoria" value="Toda sugestao precisa de trilha visivel" />
                        </InfoPanel>
                    </>
                }
            />
        </ShellContainer>
    );
}

function MetricasFoundation() {
    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Metricas"
                title="Leitura executiva de funil, atendimento e logistica"
                description="Fundacao da camada analitica com blocos claros para tomada de decisao e conexao futura com consultas detalhadas."
                meta={
                    <>
                        <StatusChip label="executive view" tone="info" />
                        <StatusChip label="atribuicao placeholder" tone="neutral" />
                    </>
                }
                actions={
                    <Link href="/attribution">
                        <Button variant="secondary">Abrir atribuicao legada</Button>
                    </Link>
                }
            />
            <KPIStrip
                items={[
                    { label: 'Conversao do funil', value: '18.4%', helper: 'Do primeiro contato ate pedido aprovado.', tone: 'success' },
                    { label: 'Tempo medio de resposta', value: '7 min', helper: 'Atendimento inicial em canais ativos.', tone: 'info' },
                    { label: 'Pedidos com risco', value: '12', helper: 'Casos que podem distorcer receita ou prazo.', tone: 'warning' },
                    { label: 'Custo logistico medio', value: 'R$ 27,80', helper: 'Media atual da operacao em pedidos monitorados.', tone: 'neutral' },
                ]}
            />
            <ContentGrid
                main={
                    <>
                        <SurfacePanel>
                            <SectionHeader title="Funil executivo" description="Estrutura base para volume, conversao e gargalos." />
                            <div className="mt-4">
                                <SimpleDataTable
                                    columns={[
                                        { key: 'etapa', label: 'Etapa' },
                                        { key: 'volume', label: 'Volume', align: 'right' },
                                        { key: 'conversao', label: 'Conversao', align: 'right' },
                                        { key: 'gargalo', label: 'Gargalo principal' },
                                    ]}
                                    rows={[
                                        { etapa: 'Leads qualificados', volume: '4.820', conversao: '100%', gargalo: 'Resposta inicial em horarios de pico' },
                                        { etapa: 'Conversas ativas', volume: '1.146', conversao: '23.8%', gargalo: 'Reabertura por falta de contexto' },
                                        { etapa: 'Pedidos aprovados', volume: '412', conversao: '8.5%', gargalo: 'Pendencia comercial e logistica' },
                                        { etapa: 'Pedidos entregues', volume: '367', conversao: '7.6%', gargalo: 'Excecoes de ultima milha' },
                                    ]}
                                />
                            </div>
                        </SurfacePanel>

                        <SurfacePanel>
                            <SectionHeader title="Atendimento e logistica" description="Dois eixos que mais afetam a percepcao operacional do cliente." />
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <StackCard title="Atendimento" subtitle="SLA, backlog e reabertura" detail="Visao consolidada para CX Ops com foco em velocidade e assertividade." />
                                <StackCard title="Logistica" subtitle="Custo, prazo e excecao" detail="Indicadores de simulacao, coleta, tracking e contingencia." />
                            </div>
                        </SurfacePanel>
                    </>
                }
                side={
                    <>
                        <InfoPanel title="Visao executiva">
                            <InfoLine label="Receita protegida" value="R$ 184k" />
                            <InfoLine label="Risco atual" value="17 excecoes logisticas e 12 bloqueios de pedido" />
                            <InfoLine label="Canal dominante" value="WhatsApp com apoio de operador" />
                        </InfoPanel>
                        <InfoPanel title="Atribuicao placeholder">
                            <p className="text-sm leading-6 text-[hsl(var(--ui-text-muted))]">
                                Estrutura pronta para conviver com a tela legada de atribuicao, mas agora como parte de um mapa executivo unico.
                            </p>
                        </InfoPanel>
                    </>
                }
            />
        </ShellContainer>
    );
}

function TenantFoundation() {
    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Tenant"
                title="Governanca operacional do tenant"
                description="Pagina foundation para identidade, branding, canais, posture operacional e readiness multi-tenant."
                meta={
                    <>
                        <StatusChip label="multi-tenant ready" tone="info" />
                        <StatusChip label="governanca visivel" tone="success" />
                    </>
                }
            />
            <ContentGrid
                main={
                    <>
                        <EntitySummaryCard
                            title="Tenant observatorio"
                            subtitle="Workspace usado como referencia para rollout da nova arquitetura."
                            status={{ label: 'operacional', tone: 'success' }}
                            fields={[
                                { label: 'Branding', value: 'Condstore OS industrial' },
                                { label: 'Canais ativos', value: 'WhatsApp, email e backoffice' },
                                { label: 'Stack primaria', value: 'Cockpit + Operacao + Frank' },
                                { label: 'Postura de risco', value: 'Moderada com auditoria ativa' },
                            ]}
                        />
                        <SurfacePanel>
                            <SectionHeader title="Canais e status operacional" description="Base para habilitacao, monitoramento e ownership." />
                            <div className="mt-4">
                                <SimpleDataTable
                                    columns={[
                                        { key: 'canal', label: 'Canal' },
                                        { key: 'estado', label: 'Estado' },
                                        { key: 'owner', label: 'Owner' },
                                        { key: 'observacao', label: 'Observacao' },
                                    ]}
                                    rows={[
                                        { canal: 'WhatsApp oficial', estado: <StatusChip label="ativo" tone="success" />, owner: 'CX Ops', observacao: 'Canal principal de atendimento.' },
                                        { canal: 'Email operacional', estado: <StatusChip label="ativo" tone="info" />, owner: 'Backoffice', observacao: 'Suporte a comprovantes e escalacoes.' },
                                        { canal: 'Frank assistido', estado: <StatusChip label="restrito" tone="warning" />, owner: 'Admin Ops', observacao: 'Apenas sugestoes, sem autonomia plena.' },
                                    ]}
                                />
                            </div>
                        </SurfacePanel>
                    </>
                }
                side={
                    <>
                        <InfoPanel title="Branding">
                            <InfoLine label="Nome exibido" value="CONDSTORE OS" />
                            <InfoLine label="Postura visual" value="Infraestrutura operacional premium" />
                            <InfoLine label="Modo atual" value="Shell unificado com densidade enterprise" />
                        </InfoPanel>
                        <InfoPanel title="Status operacional">
                            <InfoLine label="SLA global" value="Dentro da faixa alvo" />
                            <InfoLine label="Auditoria" value="Ligada para mudancas sensiveis" />
                            <InfoLine label="Integracoes criticas" value="Provisionadas e monitoradas" />
                        </InfoPanel>
                    </>
                }
            />
        </ShellContainer>
    );
}

function ConfiguracoesFoundation() {
    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Configuracoes"
                title="Usuarios, permissao, integracoes e auditoria"
                description="Pagina foundation para a camada de governanca do workspace. A tela tecnica legada continua acessivel, mas o fluxo principal agora nasce desta estrutura."
                meta={
                    <>
                        <StatusChip label="governanca" tone="success" />
                        <StatusChip label="settings legacy preservado" tone="neutral" />
                    </>
                }
                actions={
                    <Link href="/settings">
                        <Button variant="secondary">Abrir configuracoes tecnicas</Button>
                    </Link>
                }
            />
            <KPIStrip
                items={[
                    { label: 'Usuarios ativos', value: '38', helper: 'Pessoas com acesso ao tenant e ao shell operacional.', tone: 'neutral' },
                    { label: 'Permissoes customizadas', value: '7', helper: 'Perfis que fogem do preset padrao do workspace.', tone: 'info' },
                    { label: 'Integracoes criticas', value: '5', helper: 'Canais, billing, AI provider e webhooks observados.', tone: 'success' },
                    { label: 'Eventos de auditoria', value: '124', helper: 'Mudancas registradas no periodo recente.', tone: 'warning' },
                ]}
            />
            <ContentGrid
                main={
                    <>
                        <SurfacePanel>
                            <SectionHeader title="Usuarios e permissoes" description="Base para acesso operacional e administracao multi-tenant." />
                            <div className="mt-4">
                                <SimpleDataTable
                                    columns={[
                                        { key: 'perfil', label: 'Perfil' },
                                        { key: 'escopo', label: 'Escopo' },
                                        { key: 'uso', label: 'Uso principal' },
                                    ]}
                                    rows={[
                                        { perfil: 'Admin', escopo: 'Governanca total', uso: 'Tenant, integracoes, auditoria e politicas' },
                                        { perfil: 'Manager', escopo: 'Operacao e aprovacao', uso: 'Fila, pedidos, logistica e revisao de IA' },
                                        { perfil: 'Operator', escopo: 'Execucao assistida', uso: 'Conversas, pedidos e excecoes controladas' },
                                        { perfil: 'Viewer', escopo: 'Leitura restrita', uso: 'Acompanhamento e consultas executivas' },
                                    ]}
                                />
                            </div>
                        </SurfacePanel>

                        <SurfacePanel>
                            <SectionHeader title="Integracoes, AI provider e auditoria" description="Blocos estruturais para expansao futura das configuracoes." />
                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                <StackCard title="Integracoes" subtitle="Canais e webhooks" detail="WhatsApp, email, billing e conectores de operacao." />
                                <StackCard title="AI provider" subtitle="Camada de provedor" detail="Modelo, chave, politica e guardrails do tenant." />
                                <StackCard title="Auditoria" subtitle="Trilha imutavel" detail="Registro de mudanca com actor, motivo e aprovacao." />
                            </div>
                        </SurfacePanel>
                    </>
                }
                side={
                    <>
                        <InfoPanel title="Checklist de governanca">
                            <InfoLine label="Usuarios orfaos" value="Nenhum sinalizado no snapshot base" />
                            <InfoLine label="Integracao sem owner" value="1 webhook aguardando definicao" />
                            <InfoLine label="Politica de IA" value="Assistive only, com revisao humana" />
                        </InfoPanel>
                        <InfoPanel title="Auditoria recente">
                            <EventList
                                items={[
                                    { title: 'Perfil manager revisado', time: 'Hoje', detail: 'Escopo atualizado para aprovar mudancas de operacao.', tone: 'info' },
                                    { title: 'Canal WhatsApp revalidado', time: 'Ontem', detail: 'Token e ownership confirmados sem quebra operacional.', tone: 'success' },
                                    { title: 'Webhook sem owner identificado', time: 'Ontem', detail: 'Pendencia marcada para o proximo ciclo de governanca.', tone: 'warning' },
                                ]}
                            />
                        </InfoPanel>
                    </>
                }
            />
        </ShellContainer>
    );
}
