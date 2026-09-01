'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Activity, ArrowRight, BarChart3, CheckCircle2, Clock3, DollarSign, GripVertical, HelpCircle, Keyboard, PackageX, Phone, Plus, RefreshCw, Target, Timer, TrendingUp, Users, X, Zap } from 'lucide-react';
import { OperationFeedback, type OperationFeedbackState } from '../_components/operation-feedback';

interface ConversationCard {
    id: string;
    phoneHash?: string;
    phone?: string;
    status: string;
    stage: 'NEW' | 'QUALIFYING' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST';
    lastMessageAt: string;
}

const COLUMNS = [
    { id: 'NEW', title: 'Novos', description: 'Entraram agora', accent: 'bg-slate-400', soft: 'bg-slate-50' },
    { id: 'QUALIFYING', title: 'Qualificando', description: 'Entender necessidade', accent: 'bg-sky-500', soft: 'bg-sky-50/50' },
    { id: 'QUOTED', title: 'Cotados', description: 'Aguardando retorno', accent: 'bg-amber-500', soft: 'bg-amber-50/50' },
    { id: 'NEGOTIATING', title: 'Negociando', description: 'Decisão em andamento', accent: 'bg-violet-500', soft: 'bg-violet-50/50' },
    { id: 'WON', title: 'Ganhos', description: 'Prontos para avançar', accent: 'bg-emerald-500', soft: 'bg-emerald-50/50' },
    { id: 'LOST', title: 'Perdidos', description: 'Histórico comercial', accent: 'bg-rose-500', soft: 'bg-rose-50/50' },
] as const;

interface PipelineMetrics {
    totalLeads: number;
    conversionRate: number;
    avgQuoteValue: number;
    totalQuotesSent: number;
    opportunitiesLost: number;
    dealsWon: number;
}

export default function PipelineClient() {
    const [conversations, setConversations] = useState<ConversationCard[]>([]);
    const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [draggedItem, setDraggedItem] = useState<ConversationCard | null>(null);
    const [activeColumn, setActiveColumn] = useState('NEW');
    const [search, setSearch] = useState('');
    const [feedback, setFeedback] = useState<OperationFeedbackState | null>(null);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const fetchPipelineData = async () => {
        setLoading(true);
        try {
            const [resConv, resMet] = await Promise.all([
                fetch('/api/cockpit/pipeline?limit=200'),
                fetch('/api/cockpit/pipeline/metrics'),
            ]);
            if (resConv.ok) {
                const json = await resConv.json();
                setConversations(json.data || []);
            }
            if (resMet.ok) {
                const json = await resMet.json();
                setMetrics(json.data);
            }
        } catch {
            setFeedback({ tone: 'error', title: 'Não foi possível sincronizar o pipeline', description: 'Tente novamente em alguns instantes.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPipelineData(); }, []);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
            if (event.key === 'Escape') {
                setShortcutsOpen(false);
                if (isTyping) (target as HTMLInputElement).blur();
                return;
            }
            if (isTyping) return;
            if (event.key === '/' || (event.key.toLowerCase() === 'f' && event.metaKey)) {
                event.preventDefault();
                searchRef.current?.focus();
            } else if (event.key.toLowerCase() === 'r') {
                event.preventDefault();
                fetchPipelineData();
            } else if (event.key === '?') {
                event.preventDefault();
                setShortcutsOpen(true);
            } else if (/^[1-6]$/.test(event.key)) {
                event.preventDefault();
                setActiveColumn(COLUMNS[Number(event.key) - 1].id);
            } else if (event.key.toLowerCase() === 'n') {
                event.preventDefault();
                window.location.href = '/cockpit/atendimento';
            }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    const filteredConversations = useMemo(() => conversations.filter((item) => `${item.phone || ''} ${item.phoneHash || ''}`.toLowerCase().includes(search.toLowerCase())), [conversations, search]);

    const updateStage = async (conversationId: string, newStage: string) => {
        const previous = conversations;
        setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, stage: newStage as ConversationCard['stage'] } : conversation));
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/stage`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStage }),
            });
            if (!res.ok) throw new Error('stage-update-failed');
            setFeedback({ tone: 'success', title: 'Etapa atualizada' });
        } catch {
            setConversations(previous);
            setFeedback({ tone: 'error', title: 'Não foi possível mover a conversa', description: 'A alteração foi desfeita e o pipeline permanece seguro.' });
        } finally {
            fetchPipelineData();
        }
    };

    const handleDrop = (event: React.DragEvent, columnId: string) => {
        event.preventDefault();
        if (draggedItem && draggedItem.stage !== columnId) updateStage(draggedItem.id, columnId);
        setDraggedItem(null);
    };

    const averageAgeHours = conversations.length ? conversations.reduce((total, item) => total + Math.max(0, Date.now() - new Date(item.lastMessageAt).getTime()) / 3600000, 0) / conversations.length : 0;
    const oldestAgeHours = conversations.length ? Math.max(...conversations.map((item) => Math.max(0, Date.now() - new Date(item.lastMessageAt).getTime()) / 3600000)) : 0;
    const activeDeals = conversations.filter((item) => !['WON', 'LOST'].includes(item.stage)).length;
    const waitingForAction = conversations.filter((item) => ['NEW', 'QUALIFYING', 'QUOTED'].includes(item.stage)).length;
    const winRate = metrics && metrics.dealsWon + metrics.opportunitiesLost > 0 ? Math.round((metrics.dealsWon / (metrics.dealsWon + metrics.opportunitiesLost)) * 100) : 0;
    const formatAge = (hours: number) => hours < 1 ? 'agora' : hours < 24 ? `${Math.round(hours)}h` : `${Math.floor(hours / 24)}d ${Math.round(hours % 24)}h`;

    const metricsCards = metrics ? [
        { label: 'Leads no funil', value: metrics.totalLeads, icon: Users, tone: 'text-sky-700 bg-sky-50' },
        { label: 'Conversão', value: `${metrics.conversionRate}%`, icon: TrendingUp, tone: 'text-violet-700 bg-violet-50' },
        { label: 'Ticket médio', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.avgQuoteValue), icon: DollarSign, tone: 'text-emerald-700 bg-emerald-50' },
        { label: 'Ganhos', value: metrics.dealsWon, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
        { label: 'Perdidos', value: metrics.opportunitiesLost, icon: PackageX, tone: 'text-rose-700 bg-rose-50' },
        { label: 'Cotações enviadas', value: metrics.totalQuotesSent, icon: BarChart3, tone: 'text-amber-700 bg-amber-50' },
        { label: 'Win rate', value: `${winRate}%`, icon: Target, tone: 'text-indigo-700 bg-indigo-50' },
    ] as const : [];

    if (loading && !metrics) return <div className="flex min-h-[32rem] items-center justify-center text-sm text-[hsl(var(--ui-text-muted))]">Carregando pipeline...</div>;

    return (
        <div className="flex min-h-full flex-col gap-5 pb-4">
            <OperationFeedback feedback={feedback} />
            <header className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                    <div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600"><span className="h-2 w-2 rounded-full bg-violet-500" /> Negociações</div><h1 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">Avance cada conversa até o próximo passo.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Um pipeline visual para acompanhar clientes, cotações e decisões sem perder o contexto da operação.</p></div>
                    <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setShortcutsOpen(true)} aria-label="Ver atalhos de teclado" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"><Keyboard className="h-4 w-4" /> <span className="hidden sm:inline">Atalhos</span><kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">?</kbd></button><button type="button" onClick={fetchPipelineData} aria-label="Atualizar pipeline" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Atualizar</span></button><a href="/cockpit/atendimento" className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-sm font-semibold text-white transition hover:bg-violet-700"><Plus className="h-4 w-4" /> Nova conversa</a></div>
                </div>
                <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 sm:max-w-sm"><Phone className="h-4 w-4 shrink-0 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por telefone ou cliente" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" /></div><p className="text-xs text-slate-400">Arraste um cartão para mudar a etapa. As mudanças são salvas automaticamente.</p></div>
            </header>

            {metrics ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">{metricsCards.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-slate-500">{label}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 truncate text-xl font-semibold tracking-tight text-slate-950">{value}</p></div>)}</div> : null}

            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-violet-600" /><h2 className="text-sm font-semibold text-slate-900">Inteligência do funil</h2></div><p className="mt-1 text-xs text-slate-500">Sinais calculados a partir das conversas atuais.</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><Zap className="h-3 w-3" /> Ao vivo</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-2 text-slate-500"><TrendingUp className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">Em andamento</span></div><p className="mt-2 text-lg font-semibold text-slate-950">{activeDeals}</p><p className="text-[10px] text-slate-400">fora de ganhos/perdas</p></div><div className="rounded-xl bg-amber-50/70 p-3"><div className="flex items-center gap-2 text-amber-700"><Timer className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">Aguardando ação</span></div><p className="mt-2 text-lg font-semibold text-slate-950">{waitingForAction}</p><p className="text-[10px] text-slate-400">novos, qualificação ou cotação</p></div><div className="rounded-xl bg-sky-50/70 p-3"><div className="flex items-center gap-2 text-sky-700"><Clock3 className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">Tempo médio</span></div><p className="mt-2 text-lg font-semibold text-slate-950">{formatAge(averageAgeHours)}</p><p className="text-[10px] text-slate-400">desde a última mensagem</p></div><div className="rounded-xl bg-rose-50/70 p-3"><div className="flex items-center gap-2 text-rose-700"><Clock3 className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">Mais antigo</span></div><p className="mt-2 text-lg font-semibold text-slate-950">{formatAge(oldestAgeHours)}</p><p className="text-[10px] text-slate-400">sinal para priorização</p></div></div></section>

            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 lg:hidden">{COLUMNS.map((column) => { const count = filteredConversations.filter((item) => (item.stage || 'NEW') === column.id).length; return <button key={column.id} type="button" onClick={() => setActiveColumn(column.id)} className={`shrink-0 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${activeColumn === column.id ? 'bg-slate-950 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}><span className="block">{column.title}</span><span className={`mt-0.5 block text-[10px] ${activeColumn === column.id ? 'text-slate-300' : 'text-slate-400'}`}>{count} cartões</span></button>; })}</div>

            <div className="flex min-h-[31rem] gap-4 overflow-x-auto pb-4 lg:min-h-[36rem]">
                {COLUMNS.map((column) => {
                    const columnItems = filteredConversations.filter((item) => (item.stage || 'NEW') === column.id);
                    const isVisibleOnMobile = activeColumn === column.id;
                    return <section key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, column.id)} className={`${isVisibleOnMobile ? 'flex' : 'hidden'} min-h-[31rem] w-full shrink-0 flex-col rounded-2xl border border-slate-200/80 ${column.soft} lg:flex lg:min-h-[36rem] lg:w-[19rem] xl:w-[20rem]`}>
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-4 py-4"><div className="flex items-start gap-2.5"><span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${column.accent}`} /><div><h2 className="text-sm font-semibold text-slate-900">{column.title}</h2><p className="mt-0.5 text-[11px] text-slate-500">{column.description}</p></div></div><span className="rounded-full bg-white/80 px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200/70">{columnItems.length}</span></div>
                        <div className="flex flex-1 flex-col gap-2.5 p-3">
                            {columnItems.map((item) => <article key={item.id} draggable onDragStart={(event) => { setDraggedItem(item); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); }} className="group cursor-grab rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md active:cursor-grabbing"><div className="flex items-start gap-2"><span className="mt-0.5 text-slate-300 group-hover:text-violet-400"><GripVertical className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><span className="truncate">{item.phone || `${item.phoneHash?.slice(0, 10)}...` || 'Cliente sem telefone'}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">Conversa comercial aguardando o próximo passo.</p></div></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5"><span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Clock3 className="h-3 w-3" /> {format(new Date(item.lastMessageAt), 'dd/MM HH:mm')}</span><a href="/cockpit/atendimento" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900">Abrir <ArrowRight className="h-3 w-3" /></a></div></article>)}
                            {columnItems.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center px-5 text-center text-slate-400"><HelpCircle className="h-7 w-7 text-slate-300" /><p className="mt-3 text-xs font-semibold text-slate-500">Nenhuma conversa aqui</p><p className="mt-1 text-[11px] leading-5">Arraste um cartão para esta etapa ou inicie uma nova conversa.</p></div> : null}
                        </div>
                    </section>;
                })}
            </div>

            {shortcutsOpen ? <div role="dialog" aria-modal="true" aria-labelledby="shortcut-title" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:items-center"><div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-violet-700"><Keyboard className="h-4 w-4" /><p className="text-[11px] font-bold uppercase tracking-[0.16em]">Navegação rápida</p></div><h2 id="shortcut-title" className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Atalhos inteligentes</h2><p className="mt-1 text-sm text-slate-500">Acelere as tarefas sem tirar as mãos do teclado.</p></div><button type="button" onClick={() => setShortcutsOpen(false)} aria-label="Fechar atalhos" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button></div><div className="mt-5 divide-y divide-slate-100">{[['/', 'Buscar no pipeline'], ['R', 'Atualizar dados'], ['N', 'Nova conversa'], ['1–6', 'Selecionar etapa no mobile'], ['?', 'Abrir esta ajuda'], ['Esc', 'Fechar ajuda ou busca']].map(([key, label]) => <div key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0"><span className="text-sm text-slate-600">{label}</span><kbd className="min-w-10 rounded-lg bg-slate-100 px-2 py-1 text-center text-xs font-bold text-slate-700 ring-1 ring-slate-200">{key}</kbd></div>)}</div><p className="mt-5 text-[11px] leading-5 text-slate-400">Os atalhos não interferem enquanto você estiver digitando em um campo.</p></div></div> : null}
        </div>
    );
}
