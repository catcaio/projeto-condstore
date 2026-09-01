'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Command,
  ExternalLink,
  Filter,
  MessageSquare,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Truck,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { CockpitOperationalDashboard } from './CockpitOperationalDashboard';

type WorkItem = {
  id: string;
  title: string;
  detail: string;
  context: string;
  age: string;
  tone: 'violet' | 'amber' | 'blue' | 'rose';
  href: string;
  icon: typeof MessageSquare;
};

const WORK_ITEMS: WorkItem[] = [
  {
    id: 'conversation-1',
    title: 'Responder conversa de cliente',
    detail: 'A empresa Solaris aguarda retorno sobre o prazo de entrega.',
    context: 'Conversa · Solaris Distribuição',
    age: 'há 12 min',
    tone: 'violet',
    href: '/cockpit/atendimento',
    icon: MessageSquare,
  },
  {
    id: 'quote-1',
    title: 'Validar cotação antes de enviar',
    detail: 'A cotação #QT-2084 está pronta e precisa de uma decisão.',
    context: 'Negociação · Cotação #QT-2084',
    age: 'há 28 min',
    tone: 'amber',
    href: '/cockpit/pipeline',
    icon: Zap,
  },
  {
    id: 'order-1',
    title: 'Acompanhar pedido em trânsito',
    detail: 'O pedido #PED-914 está sem atualização há 18 horas.',
    context: 'Pedido · Expedição Sul',
    age: 'há 1 h',
    tone: 'blue',
    href: '/cockpit/orders',
    icon: PackageCheck,
  },
  {
    id: 'shipment-1',
    title: 'Resolver exceção logística',
    detail: 'A transportadora sinalizou divergência no endereço de entrega.',
    context: 'Logística · Shipment #SHP-442',
    age: 'há 2 h',
    tone: 'rose',
    href: '/logistica/envios',
    icon: Truck,
  },
];

const toneStyles = {
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  blue: 'bg-sky-50 text-sky-700 ring-sky-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
};

export function CockpitWorkspace({ role, tenantId }: { role: string; tenantId: string }) {
  const [items, setItems] = useState(WORK_ITEMS);
  const [showAll, setShowAll] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const isManager = role === 'admin' || role === 'manager';

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => `${item.title} ${item.detail} ${item.context}`.toLowerCase().includes(query.toLowerCase()));
    return showAll ? filtered : filtered.slice(0, 3);
  }, [items, query, showAll]);

  const completeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.8)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Cockpit inteligente</span>
              <span className="text-slate-500">/</span>
              <span>Visão operacional</span>
            </div>
            <h1 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Bom trabalho, sua operação está em movimento.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Comece pelo que precisa de atenção. O contexto acompanha você da conversa ao pedido e do pedido à logística.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowSearch((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-cyan-300/70"><Search className="h-4 w-4" /> Buscar <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300 sm:inline">⌘ K</kbd></button>
            <Link href="/cockpit/atendimento" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-300/70"><Plus className="h-4 w-4" /> Nova ação</Link>
          </div>
        </div>
        {showSearch ? (
          <div className="relative mt-6 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarefa, cliente ou pedido..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400" />
            <button type="button" onClick={() => { setQuery(''); setShowSearch(false); }} aria-label="Fechar busca" className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        ) : null}
        <div className="relative mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
          {[['4', 'ações abertas'], ['2', 'conversas aguardando'], ['1', 'exceção logística'], [isManager ? '12' : '6', isManager ? 'pessoas na operação' : 'processos em curso']].map(([value, label]) => <div key={label}><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold tracking-tight text-slate-950">Sua fila de trabalho</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{items.length}</span></div><p className="mt-1 text-sm text-slate-500">Próximas ações organizadas pelo impacto na operação.</p></div>
            <button type="button" onClick={() => setShowAll((value) => !value)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-900">{showAll ? 'Mostrar menos' : 'Ver todas'} <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-5 divide-y divide-slate-100">
            {visibleItems.length ? visibleItems.map((item) => { const Icon = item.icon; return <article key={item.id} className="group flex gap-3 py-4 first:pt-0 last:pb-0"><div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${toneStyles[item.tone]}`}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><h3 className="text-sm font-semibold text-slate-900">{item.title}</h3><span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-400"><Clock3 className="h-3 w-3" /> {item.age}</span></div><p className="mt-1 text-sm leading-5 text-slate-500">{item.detail}</p><div className="mt-2 flex flex-wrap items-center gap-3"><span className="text-[11px] font-medium text-slate-400">{item.context}</span><Link href={item.href} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 opacity-100 transition hover:text-violet-900 sm:opacity-0 sm:group-hover:opacity-100">Abrir contexto <ExternalLink className="h-3 w-3" /></Link></div></div><button type="button" onClick={() => completeItem(item.id)} title="Marcar como concluída" aria-label={`Concluir: ${item.title}`} className="self-start rounded-lg p-1.5 text-slate-300 transition hover:bg-emerald-50 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"><CheckCircle2 className="h-5 w-5" /></button></article>; }) : <div className="flex flex-col items-center justify-center py-12 text-center"><CheckCircle2 className="h-8 w-8 text-emerald-500" /><p className="mt-3 text-sm font-semibold text-slate-900">Tudo em dia</p><p className="mt-1 text-sm text-slate-500">Nenhuma ação corresponde à sua busca.</p></div>}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500"><Command className="h-4 w-4 text-slate-400" /><span>Use a busca para encontrar rapidamente qualquer cliente, conversa, pedido ou shipment.</span></div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Contexto ativo</p><h2 className="mt-2 text-base font-semibold text-slate-950">Operação hoje</h2></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><RefreshCw className="h-4 w-4" /></span></div><div className="mt-5 space-y-3"><Link href="/cockpit/atendimento" className="flex items-center gap-3 rounded-xl p-2 -mx-2 transition hover:bg-slate-50"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><MessageSquare className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">Conversas</span><span className="block text-xs text-slate-400">2 aguardando resposta</span></span><ChevronDown className="h-4 w-4 -rotate-90 text-slate-300" /></Link><Link href="/cockpit/orders" className="flex items-center gap-3 rounded-xl p-2 -mx-2 transition hover:bg-slate-50"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><PackageCheck className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">Pedidos</span><span className="block text-xs text-slate-400">6 em andamento</span></span><ChevronDown className="h-4 w-4 -rotate-90 text-slate-300" /></Link><Link href="/logistica/envios" className="flex items-center gap-3 rounded-xl p-2 -mx-2 transition hover:bg-slate-50"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Truck className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">Logística</span><span className="block text-xs text-slate-400">1 exceção requer atenção</span></span><ChevronDown className="h-4 w-4 -rotate-90 text-slate-300" /></Link></div></section>
          <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5"><div className="flex items-center gap-2 text-violet-700"><Sparkles className="h-4 w-4" /><p className="text-[11px] font-bold uppercase tracking-[0.16em]">Sugestão do Frank</p></div><p className="mt-3 text-sm font-semibold leading-5 text-slate-900">Priorize a conversa da Solaris: ela está ligada a uma cotação pronta para aprovação.</p><p className="mt-2 text-xs leading-5 text-slate-500">Uma ação agora pode destravar o próximo passo comercial.</p><Link href="/cockpit/atendimento" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-900">Ver conversa conectada <ArrowRight className="h-3.5 w-3.5" /></Link></section>
          <section className="rounded-3xl border border-slate-200/80 bg-slate-50 p-5"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-500" /><p className="text-xs font-semibold text-slate-700">Perspectiva {isManager ? 'de gestão' : 'do operador'}</p></div><p className="mt-2 text-xs leading-5 text-slate-500">{isManager ? 'Acompanhe gargalos e intervenha onde a operação precisa de você.' : 'Resolva o próximo passo sem perder o contexto do cliente.'}</p></section>
        </aside>
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold tracking-tight text-slate-950">Pulso da operação</h2><p className="mt-1 text-sm text-slate-500">Métricas para orientar decisões, não para criar mais uma tela.</p></div><Link href="/cockpit/metrics" className="hidden items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-950 sm:inline-flex">Ver detalhes <ArrowRight className="h-4 w-4" /></Link></div><CockpitOperationalDashboard tenantId={tenantId} /></section>

      <div className="flex items-center justify-between gap-4 border-t border-slate-200/70 pt-5"><div className="flex items-center gap-2 text-xs text-slate-400"><Filter className="h-3.5 w-3.5" /> Contexto filtrado para este tenant</div><span className="text-xs text-slate-400">Atualização automática a cada 60s</span></div>
    </div>
  );
}
