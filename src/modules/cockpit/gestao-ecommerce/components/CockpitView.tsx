import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Layers3 } from 'lucide-react';
import { AlertBlock, EmptyState, PageHeader, SectionHeader, ShellContainer, StatusChip, SurfacePanel } from '@/ui/foundation';
import { ECOMMERCE_STATUS_LABELS, type EcommerceCockpitSnapshot, type EcommerceFilters, type EcommerceProject, type EcommerceSource, type EcommerceStatus } from '../types';
import { SeedDemoButton } from './SeedDemoButton';
import { WorkspaceConfiguration } from './WorkspaceConfiguration';

const BASE_PATH = '/cockpit/gestao-ecommerce';
const linkClass = 'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--ui-accent-blue-ink))] hover:bg-[hsl(var(--ui-accent-blue)/0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]';
const priorities = { low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };

function historyLabel(type: string): string {
    if (type === 'activity.completed') return 'Execução concluída';
    if (type === 'task.completed') return 'Entrega concluída';
    if (type === 'task.created' || type === 'project.created') return 'Registro criado';
    if (type === 'task.status_changed' || type === 'status_changed') return 'Status atualizado';
    if (type === 'demo.seeded') return 'Exemplo cadastrado';
    return 'Atualização do projeto';
}

export function ecommerceHref(filters: EcommerceFilters = {}): string {
    const query = new URLSearchParams();
    if (filters.frontCode) query.set('frontCode', filters.frontCode);
    if (filters.projectId) query.set('projectId', filters.projectId);
    return query.size ? `${BASE_PATH}?${query.toString()}` : BASE_PATH;
}

export function formatEcommerceDate(value: string | null, withTime = false): string {
    if (!value) return 'Não informado';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Data indisponível';
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } as const : {}),
    }).format(date);
}

function sourceLabel(source: EcommerceSource): string {
    return source.type === 'clickup' ? 'ClickUp' : source.type === 'demonstration' ? 'Exemplo demonstrativo' : 'Registro administrativo';
}

function Status({ status }: { status: EcommerceStatus }) {
    return <StatusChip label={ECOMMERCE_STATUS_LABELS[status]} tone={status === 'blocked' ? 'warning' : status === 'completed' ? 'success' : status === 'in_progress' || status === 'in_validation' ? 'info' : 'neutral'} />;
}

function DemoBadge() {
    return <StatusChip label="Demonstração" tone="warning" />;
}

function Evidence({ items }: { items: string[] }) {
    if (!items.length) return <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhuma evidência registrada.</p>;
    return <ul className="space-y-2 text-sm">{items.map((item, index) => {
        let isUrl = false;
        try { isUrl = ['https:', 'http:'].includes(new URL(item).protocol); } catch { /* Textual evidence remains plain text. */ }
        return <li key={`${index}-${item}`} className="break-words [overflow-wrap:anywhere]">{isUrl
            ? <a className="underline underline-offset-4 text-[hsl(var(--ui-accent-blue-ink))]" href={item} target="_blank" rel="noopener noreferrer">{item}<span className="sr-only"> (abre em outra aba)</span></a>
            : item}</li>;
    })}</ul>;
}

function Field({ label, value }: { label: string; value: string | null }) {
    return <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--ui-text-subtle))]">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{value || 'Não informado'}</dd></div>;
}

function ProjectCard({ project }: { project: EcommerceProject }) {
    return <Link href={ecommerceHref({ frontCode: project.frontCode, projectId: project.id })} className="block min-w-0 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5 transition-colors hover:border-[hsl(var(--ui-accent-blue))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[hsl(var(--ui-text-subtle))]">{project.code} · {project.frontCode}</span><Status status={project.status} />{project.isDemo && <DemoBadge />}</div>
        <h3 className="mt-3 flex items-start justify-between gap-3 font-semibold"><span className="min-w-0 break-words">{project.name}</span><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /></h3>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{project.objective || project.description || 'Objetivo ainda não registrado.'}</p>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <div><dt className="text-[hsl(var(--ui-text-subtle))]">Entregáveis concluídos</dt><dd className="mt-1 font-semibold">{project.progress.completed} de {project.progress.total}{project.progress.percentage !== null ? ` (${project.progress.percentage}%)` : ''}</dd></div>
            <div><dt className="text-[hsl(var(--ui-text-subtle))]">Previsão</dt><dd className="mt-1 font-semibold">{formatEcommerceDate(project.expectedAt)}</dd></div>
            <div><dt className="text-[hsl(var(--ui-text-subtle))]">Responsável</dt><dd className="mt-1 font-semibold">{project.responsible || 'Não informado'}</dd></div>
            <div><dt className="text-[hsl(var(--ui-text-subtle))]">Fonte</dt><dd className="mt-1 font-semibold">{sourceLabel(project.source)}</dd></div>
        </dl>
    </Link>;
}

function ManagementSummary({ snapshot }: { snapshot: EcommerceCockpitSnapshot }) {
    const metrics = [
        { label: 'Projetos ativos', value: snapshot.management.activeProjects, icon: Layers3, helper: 'Projetos em execução, planejamento ou validação.' },
        { label: 'Entregáveis concluídos', value: snapshot.management.completedDeliverables, icon: CheckCircle2, helper: 'Entregas registradas como concluídas.' },
        { label: 'Registros de atividade', value: snapshot.management.completedActivities, icon: Clock3, helper: 'Execuções concluídas com identidade própria.' },
    ];
    return <section aria-label="Indicadores gerenciais" className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">{metrics.map(({ label, value, icon: Icon, helper }) => <SurfacePanel key={label} className="min-w-0">
            <div className="flex items-start justify-between gap-3"><h2 className="text-sm font-medium text-[hsl(var(--ui-text-muted))]">{label}</h2><Icon className="h-4 w-4 shrink-0 text-[hsl(var(--ui-text-subtle))]" aria-hidden="true" /></div>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--ui-text-muted))]">{helper}</p>
        </SurfacePanel>)}</div>
        <p className="text-xs text-[hsl(var(--ui-text-muted))]">Contagens dos registros reais autorizados nesta seleção. Exemplos demonstrativos não entram nos indicadores gerenciais. Atividades, entregáveis e impacto comercial são acompanhados separadamente.</p>
    </section>;
}

function SummaryLists({ snapshot }: { snapshot: EcommerceCockpitSnapshot }) {
    return <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <SurfacePanel className="min-w-0 space-y-4"><SectionHeader title="Entregas recentes" />{snapshot.recentDeliveries.length ? <ul className="divide-y divide-[hsl(var(--ui-border))]">{snapshot.recentDeliveries.map(item => <li key={item.id} className="py-3 first:pt-0"><Link href={ecommerceHref({ projectId: item.projectId })} className="text-sm font-medium underline-offset-4 hover:underline">{item.projectCode} · {item.title}</Link><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--ui-text-muted))]"><span>{formatEcommerceDate(item.completedAt, true)}</span>{item.isDemo && <DemoBadge />}</div></li>)}</ul> : <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhuma entrega concluída disponível.</p>}</SurfacePanel>
        <SurfacePanel className="min-w-0 space-y-4"><SectionHeader title="Próximos marcos" />{snapshot.nextMilestones.length ? <ul className="divide-y divide-[hsl(var(--ui-border))]">{snapshot.nextMilestones.map((item, index) => <li key={`${item.projectId}-${index}`} className="py-3 first:pt-0"><Link href={ecommerceHref({ projectId: item.projectId })} className="text-sm font-medium underline-offset-4 hover:underline">{item.projectCode} · {item.title}</Link><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--ui-text-muted))]"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /><span>{formatEcommerceDate(item.dueAt)}</span>{item.isDemo && <DemoBadge />}</div></li>)}</ul> : <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhum marco registrado.</p>}</SurfacePanel>
        <SurfacePanel className="min-w-0 space-y-4"><SectionHeader title="Bloqueios" />{snapshot.blockers.length ? <ul className="space-y-3">{snapshot.blockers.map((item, index) => <li key={`${item.projectId}-${index}`} className="space-y-2 text-sm"><Link href={ecommerceHref({ projectId: item.projectId })} className="font-semibold underline-offset-4 hover:underline">{item.projectCode}</Link>{item.isDemo && <div><DemoBadge /></div>}<p className="whitespace-pre-wrap break-words">{item.description}</p></li>)}</ul> : <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhum bloqueio registrado.</p>}</SurfacePanel>
        <SurfacePanel className="min-w-0 space-y-4"><SectionHeader title="Decisões pendentes" />{snapshot.pendingDecisions.length ? <ul className="space-y-3">{snapshot.pendingDecisions.map((item, index) => <li key={`${item.projectId}-${index}`} className="space-y-2 text-sm"><Link href={ecommerceHref({ projectId: item.projectId })} className="font-semibold underline-offset-4 hover:underline">{item.projectCode}</Link>{item.isDemo && <div><DemoBadge /></div>}<p className="whitespace-pre-wrap break-words">{item.description}</p></li>)}</ul> : <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhuma decisão pendente registrada.</p>}</SurfacePanel>
    </div>;
}

function ProjectDetail({ project }: { project: EcommerceProject }) {
    return <div className="space-y-5">
        <SurfacePanel className="space-y-5">
            <div className="flex flex-wrap gap-2"><Status status={project.status} />{project.isDemo && <DemoBadge />}<StatusChip label={priorities[project.priority]} /></div>
            <SectionHeader title={`${project.code} · ${project.name}`} description={project.description || 'Descrição ainda não registrada.'} />
            <dl className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Frente" value={project.frontCode} /><Field label="Responsável" value={project.responsible} /><Field label="Prioridade" value={priorities[project.priority]} />
                <Field label="Início" value={formatEcommerceDate(project.startAt)} /><Field label="Previsão" value={formatEcommerceDate(project.expectedAt)} /><Field label="Próximo marco" value={project.nextMilestone ? `${project.nextMilestone.title} · ${formatEcommerceDate(project.nextMilestone.dueAt)}` : null} />
                <Field label="Problema ou oportunidade" value={project.problem} /><Field label="Objetivo" value={project.objective} /><Field label="Diagnóstico" value={project.diagnosis} />
                <Field label="Hipótese de trabalho" value={project.hypothesis} /><Field label="KPI relacionado" value={project.kpi} /><Field label="Fonte" value={sourceLabel(project.source)} />
            </dl>
            <p className="text-xs text-[hsl(var(--ui-text-muted))]">Atualização do registro: {formatEcommerceDate(project.updatedAt, true)} · Atualização na fonte: {formatEcommerceDate(project.source.updatedAt, true)} · America/Sao_Paulo</p>
        </SurfacePanel>
        <SurfacePanel className="space-y-5"><SectionHeader title="Entregáveis · WBS / EAP" description={`${project.progress.completed} de ${project.progress.total} entregáveis concluídos${project.progress.percentage === null ? '' : ` · ${project.progress.percentage}%`}. Progresso de entrega não representa resultado comercial.`} />
            {project.deliverables.length ? <ol className="space-y-3">{project.deliverables.map((deliverable, index) => <li key={deliverable.id} className="min-w-0 rounded-xl border border-[hsl(var(--ui-border))] p-4">
                <details open><summary className="cursor-pointer text-sm font-semibold leading-6">{index + 1}. {deliverable.title}</summary><div className="mt-3 space-y-3 pl-1"><Status status={deliverable.status} />{deliverable.description && <p className="whitespace-pre-wrap text-sm leading-6">{deliverable.description}</p>}<p className="text-xs text-[hsl(var(--ui-text-muted))]">Responsável: {deliverable.responsible || 'Não informado'} · Previsão: {formatEcommerceDate(deliverable.expectedAt)}</p><Evidence items={deliverable.evidence} />
                    {deliverable.tasks.length ? <ul className="space-y-3 border-l border-[hsl(var(--ui-border))] pl-4">{deliverable.tasks.map(task => <li key={task.id} className="space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{task.title}</span><Status status={task.status} /></div>{task.description && <p className="text-sm text-[hsl(var(--ui-text-muted))]">{task.description}</p>}<p className="text-xs text-[hsl(var(--ui-text-muted))]">Responsável: {task.responsible || 'Não informado'} · Previsão: {formatEcommerceDate(task.expectedAt)}</p><Evidence items={task.evidence} /></li>)}</ul> : <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhuma tarefa registrada neste entregável.</p>}
                </div></details>
            </li>)}</ol> : <EmptyState title="Nenhum entregável disponível" description="Os entregáveis serão apresentados quando houver registros autorizados da fonte de gestão." />}
        </SurfacePanel>
        <SurfacePanel className="space-y-4"><SectionHeader title="Atividades e execução" description="Cada registro representa uma execução identificada. Alterações de descrição ou status não são contadas como trabalho executado." />
            {project.activities.length ? <ol className="space-y-4">{project.activities.map(activity => <li key={activity.id} className="min-w-0 border-l-2 border-[hsl(var(--ui-border))] pl-4"><p className="text-xs text-[hsl(var(--ui-text-muted))]">{formatEcommerceDate(activity.occurredAt, true)} · {activity.responsible || 'Responsável não informado'}</p><h3 className="mt-1 text-sm font-semibold">{activity.type} · Quantidade executada: {activity.quantity}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{activity.description}</p><div className="mt-2"><Evidence items={activity.evidence} /></div><p className="mt-2 text-xs text-[hsl(var(--ui-text-muted))]">Próximo passo: {activity.nextStep || 'Não informado'}</p></li>)}</ol> : <EmptyState title="Nenhuma atividade disponível" description="Nenhum registro de execução autorizado foi encontrado para este projeto." />}
        </SurfacePanel>
        <div className="grid gap-5 lg:grid-cols-2"><SurfacePanel className="space-y-4"><SectionHeader title="Resultados e aprendizado" /><dl className="space-y-5"><Field label="Resultado observado" value={project.observedResult} /><Field label="Conclusão ou aprendizado" value={project.learning} /></dl><p className="text-xs leading-5 text-[hsl(var(--ui-text-muted))]">A relação com um KPI registra a hipótese de trabalho. Não comprova causalidade nem substitui a medição do período.</p></SurfacePanel><SurfacePanel className="space-y-4"><SectionHeader title="Evidências do projeto" /><Evidence items={project.evidence} /></SurfacePanel></div>
        <SurfacePanel><dl className="grid gap-5 sm:grid-cols-2"><Field label="Bloqueios do projeto" value={project.blockers.join('\n') || 'Nenhum bloqueio registrado.'} /><Field label="Decisões pendentes do projeto" value={project.pendingDecisions.join('\n') || 'Nenhuma decisão pendente registrada.'} /></dl></SurfacePanel>
        <SurfacePanel className="space-y-4"><SectionHeader title="Histórico do projeto" />{project.history.length ? <ol className="space-y-4">{project.history.map(event => <li key={event.id} className="border-l-2 border-[hsl(var(--ui-border))] pl-4"><p className="text-xs text-[hsl(var(--ui-text-muted))]">{formatEcommerceDate(event.occurredAt, true)} · {historyLabel(event.type)}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{event.description}</p></li>)}</ol> : <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhum evento disponível.</p>}</SurfacePanel>
    </div>;
}

export function EcommerceCockpitView({ snapshot, filters = {} }: { snapshot: EcommerceCockpitSnapshot; filters?: EcommerceFilters }) {
    const selectedFront = snapshot.fronts.find(front => front.code === filters.frontCode);
    const selectedProject = filters.projectId ? snapshot.projects.find(project => project.id === filters.projectId) : undefined;
    const realProjects = snapshot.projects.filter(project => !project.isDemo);
    const demoProjects = snapshot.projects.filter(project => project.isDemo);
    const activeProjects = realProjects.filter(project => !['completed', 'cancelled', 'backlog'].includes(project.status));
    const otherProjects = realProjects.filter(project => ['completed', 'cancelled', 'backlog'].includes(project.status));
    return <ShellContainer className="min-w-0 pb-8 [overflow-wrap:anywhere]">
        <PageHeader eyebrow={snapshot.operationName} title="Cockpit Operacional de E-commerce" description="Acompanhe frentes, projetos e entregas. O gerenciamento do trabalho acontece no ClickUp; este painel apresenta os registros autorizados."
            actions={<Link href="/cockpit" className={linkClass}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Cockpit</Link>}
            meta={<><StatusChip label={snapshot.period.label} /><StatusChip label={snapshot.permissions.canConfigure ? "Administração" : "Somente leitura"} /><StatusChip label="America/Sao_Paulo" /></>} />
        <div className="flex flex-wrap justify-between gap-2 text-xs leading-5 text-[hsl(var(--ui-text-muted))]"><p>Fonte: registros de gestão persistidos no Condstore. Última atualização: {snapshot.lastUpdatedAt ? formatEcommerceDate(snapshot.lastUpdatedAt, true) : 'Nenhum registro disponível'}.</p><p>Última sincronização ClickUp: {snapshot.lastSuccessfulSyncAt ? formatEcommerceDate(snapshot.lastSuccessfulSyncAt, true) : 'Não realizada'}.</p></div>
        <AlertBlock title={snapshot.integration.status === 'not_configured' ? 'ClickUp ainda não vinculado' : 'Workspace aguardando verificação'} description={snapshot.integration.status === 'not_configured' ? 'O ambiente de gestão da Indiana precisa ser identificado e configurado. A sincronização automática será implementada na próxima etapa, após aprovação.' : `${snapshot.integration.workspaceName || 'Workspace configurado'} ainda não possui sincronização validada. Consulte a origem de cada projeto.`} tone="info" />
        {snapshot.permissions.canConfigure && <WorkspaceConfiguration operationName={snapshot.operationName} workspaceId={snapshot.integration.workspaceId} workspaceName={snapshot.integration.workspaceName} />}
        <nav aria-label="Frentes de trabalho" className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><SectionHeader title="Frentes de trabalho" description="Selecione uma frente para consultar seus projetos." /><Link href={BASE_PATH} className={linkClass} aria-current={!filters.frontCode && !filters.projectId ? 'page' : undefined}>Todas as frentes</Link></div><div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">{snapshot.fronts.map(front => <Link key={front.code} href={ecommerceHref({ frontCode: front.code })} aria-current={filters.frontCode === front.code && !filters.projectId ? 'page' : undefined} className={`min-w-0 rounded-2xl border p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${filters.frontCode === front.code ? 'border-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-accent-blue)/0.06)]' : 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] hover:border-[hsl(var(--ui-accent-blue))]'}`}><p className="text-xs font-bold text-[hsl(var(--ui-text-subtle))]">{front.code}</p><h3 className="mt-1 font-semibold">{front.name}</h3>{front.demoProjectCount > 0 && <div className="mt-2"><DemoBadge /></div>}<p className="mt-2 text-xs leading-5 text-[hsl(var(--ui-text-muted))]">{front.objective}</p><p className="mt-3 text-xs font-medium">{front.projectCount} {front.projectCount === 1 ? 'projeto real' : 'projetos reais'} · {front.activeProjectCount} ativos</p></Link>)}</div></nav>
        <ManagementSummary snapshot={snapshot} />
        <SurfacePanel className="space-y-2"><SectionHeader title="Indicadores comerciais" /><p className="text-sm text-[hsl(var(--ui-text-muted))]">Indisponíveis nesta etapa. Vendas, faturamento, visitas e conversão serão apresentados após autorização e validação das fontes comerciais.</p></SurfacePanel>
        {filters.projectId ? <><Link href={ecommerceHref({ frontCode: selectedProject?.frontCode || filters.frontCode })} className={`${linkClass} self-start`}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Voltar aos projetos da frente</Link>{selectedProject ? <>{selectedProject.isDemo && <AlertBlock title="Projeto demonstrativo" description="Este exemplo não representa trabalho executado nem resultado comercial real. Seus registros ficam fora das contagens gerenciais." tone="warning" />}<ProjectDetail project={selectedProject} /></> : <EmptyState title="Nenhum registro disponível" description="O projeto não foi encontrado entre os registros autorizados para sua sessão." />}</> : <>
            <section className="space-y-4" aria-label="Projetos ativos"><SectionHeader title={selectedFront ? `${selectedFront.code} · ${selectedFront.name}` : 'Projetos ativos'} description={selectedFront?.objective || 'Projetos reais em planejamento, execução, validação ou bloqueados.'} />{activeProjects.length ? <div className="grid min-w-0 gap-4 lg:grid-cols-2">{activeProjects.map(project => <ProjectCard key={project.id} project={project} />)}</div> : <EmptyState title="Nenhum registro disponível" description="Não há projetos ativos reais autorizados para esta seleção." />}</section>
            {otherProjects.length > 0 && <section className="space-y-4" aria-label="Outros projetos"><SectionHeader title="Backlog e histórico de projetos" description="Projetos em backlog, concluídos ou cancelados preservam seus registros." /><div className="grid gap-4 lg:grid-cols-2">{otherProjects.map(project => <ProjectCard key={project.id} project={project} />)}</div></section>}
            <SummaryLists snapshot={snapshot} />
            <section className="space-y-4" aria-label="Exemplos demonstrativos"><SectionHeader title="Exemplo de projeto" description="CAT-001 apresenta a estrutura de gestão e WBS/EAP. Não representa dados operacionais reais." />{demoProjects.length ? <div className="grid min-w-0 gap-4 lg:grid-cols-2">{demoProjects.map(project => <ProjectCard key={project.id} project={project} />)}</div> : <SurfacePanel><p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhum exemplo demonstrativo cadastrado.</p>{snapshot.permissions.canConfigure && <div className="mt-4"><SeedDemoButton /></div>}</SurfacePanel>}</section>
        </>}
    </ShellContainer>;
}
