"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ancestors,
  FLOWS,
  META,
  nodeById,
  NODES,
  VIEWS,
  VIEW_LABEL,
  type ViewId,
} from "@/modules/architecture-explorer/lib/architecture";
import { useExplorer, type Scope } from "@/modules/architecture-explorer/store/explorer";
import { CommandSearch } from "@/modules/architecture-explorer/components/command-search";
import { GraphCanvas } from "@/modules/architecture-explorer/components/graph-canvas";
import { Inspector } from "@/modules/architecture-explorer/components/inspector";
import { SideNav } from "@/modules/architecture-explorer/components/side-nav";
import { HelpDialog } from "@/modules/architecture-explorer/components/help-dialog";
import { Menu, Moon, PanelRight, Search, Sun, HelpCircle } from "lucide-react";

const VALID_VIEWS = new Set(VIEWS);

function parseView(v: string | null): ViewId {
  if (v && VALID_VIEWS.has(v as ViewId)) return v as ViewId;
  return "architecture";
}

export function ExplorerApp() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = useExplorer((s) => s.view);
  const scope = useExplorer((s) => s.scope);
  const selectedId = useExplorer((s) => s.selectedId);
  const selectedFlow = useExplorer((s) => s.selectedFlow);
  const theme = useExplorer((s) => s.theme);
  const navOpen = useExplorer((s) => s.navOpen);
  const inspectorOpen = useExplorer((s) => s.inspectorOpen);
  const hydrate = useExplorer((s) => s.hydrate);
  const setNavOpen = useExplorer((s) => s.setNavOpen);
  const setInspectorOpen = useExplorer((s) => s.setInspectorOpen);
  const setSearchOpen = useExplorer((s) => s.setSearchOpen);
  const setHelpOpen = useExplorer((s) => s.setHelpOpen);
  const toggleTheme = useExplorer((s) => s.toggleTheme);
  const setView = useExplorer((s) => s.setView);
  const setScope = useExplorer((s) => s.setScope);
  const select = useExplorer((s) => s.select);
  const expandTo = useExplorer((s) => s.expandTo);
  const requestCenter = useExplorer((s) => s.requestCenter);
  const setFlow = useExplorer((s) => s.setFlow);
  const toggleExpand = useExplorer((s) => s.toggleExpand);
  const resetExpanded = useExplorer((s) => s.resetExpanded);

  useEffect(() => {
    const v = parseView(searchParams.get("view"));
    const sc: Scope = searchParams.get("scope") === "mvp" ? "mvp" : "full";
    const node = searchParams.get("node") || null;
    const flow = searchParams.get("flow") || "lead-to-delivery";
    hydrate({ view: v, scope: sc, selectedId: node, selectedFlow: flow });
    if (node) {
      expandTo([...ancestors(node).map((a) => a.id), node]);
      requestCenter(node);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", view);
    params.set("scope", scope);
    if (selectedId) params.set("node", selectedId);
    if (view === "flow" && selectedFlow) params.set("flow", selectedFlow);
    const qs = params.toString();
    router.replace(`${pathname}?${qs}`, { scroll: false });
  }, [view, scope, selectedId, selectedFlow, pathname, router]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (typing) return;
      if (e.key === "Escape") {
        select(null);
        setSearchOpen(false);
        setHelpOpen(false);
        setNavOpen(false);
      }
      if (e.key === "?") setHelpOpen(true);
      if (e.key === "1") setView("architecture");
      if (e.key === "2") setView("flow");
      if (e.key === "3") setView("dependencies");
      if (e.key === "4") setView("data");
      if (e.key === "5") setView("integrations");
      if (e.key === "6") setView("ai");
      if (e.key === "7") setView("infra");
      if (e.key === "8") setView("tenant");
      if (e.key === "m") setScope(scope === "mvp" ? "full" : "mvp");
      if (e.key === "e" && selectedId) toggleExpand(selectedId);
      if (e.key === "0") resetExpanded();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    scope,
    selectedId,
    select,
    setHelpOpen,
    setNavOpen,
    setSearchOpen,
    setScope,
    setView,
    toggleExpand,
    resetExpanded,
  ]);

  const node = selectedId ? nodeById(selectedId) : undefined;
  const crumbs = node ? [...ancestors(node.id), node] : [];
  const flow = FLOWS.find((f) => f.id === selectedFlow);

  return (
    <div className="explorer-root flex h-dvh flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-3">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg)] lg:hidden"
          onClick={() => setNavOpen(true)}
          aria-label="Abrir navegação"
        >
          <Menu className="size-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium tracking-[0.16em] text-[var(--color-fg-subtle)] uppercase">
            Architecture explorer
          </p>
          <h1 className="truncate text-sm font-medium tracking-tight">{META.product}</h1>
        </div>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mx-auto hidden h-9 min-w-[240px] max-w-md flex-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 text-left text-sm text-[var(--color-fg-subtle)] hover:border-[var(--color-border-strong)] md:flex"
        >
          <Search className="size-3.5" />
          Pesquisar no CondStore...
          <kbd className="ml-auto font-mono text-[10px] text-[var(--color-fg-subtle)]">/</kbd>
        </button>
        <button
          type="button"
          className="size-9 rounded-lg text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)] md:hidden"
          onClick={() => setSearchOpen(true)}
          aria-label="Pesquisar"
        >
          <Search className="size-4 mx-auto" />
        </button>
        <div className="hidden items-center gap-1 md:flex">
          {(["mvp", "full"] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`h-8 rounded-full px-3 text-xs font-medium ${
                scope === s
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg)]"
              }`}
            >
              {s === "mvp" ? "MVP" : "Completo"}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="size-9 rounded-lg text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg)]"
          onClick={toggleTheme}
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun className="mx-auto size-4" /> : <Moon className="mx-auto size-4" />}
        </button>
        <button
          type="button"
          className="size-9 rounded-lg text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg)]"
          onClick={() => setHelpOpen(true)}
          aria-label="Atalhos"
        >
          <HelpCircle className="mx-auto size-4" />
        </button>
        <button
          type="button"
          className="size-9 rounded-lg text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg)] lg:hidden"
          onClick={() => setInspectorOpen(!inspectorOpen)}
          aria-label="Painel de detalhes"
        >
          <PanelRight className="mx-auto size-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-60 shrink-0 lg:block">
          <SideNav />
        </div>

        {navOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" className="absolute inset-0 bg-[var(--color-bg)]/60" aria-label="Fechar" onClick={() => setNavOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
              <SideNav />
            </div>
          </div>
        )}

        <main className="relative min-w-0 flex-1">
          <div className="absolute left-3 top-3 z-10 hidden max-w-[min(720px,70vw)] gap-1 overflow-x-auto md:flex">
            {VIEWS.slice(0, 6).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium ${
                  view === v
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg-elevated)]/90 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                }`}
              >
                {VIEW_LABEL[v]}
              </button>
            ))}
          </div>
          <GraphCanvas />
        </main>

        <div className="hidden w-[340px] shrink-0 xl:block">
          <Inspector />
        </div>

        {inspectorOpen && (
          <div className="fixed inset-0 z-40 xl:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[var(--color-bg)]/60"
              aria-label="Fechar detalhes"
              onClick={() => setInspectorOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 w-full max-w-md shadow-xl">
              <Inspector />
            </div>
          </div>
        )}
      </div>

      <footer className="flex h-10 shrink-0 items-center gap-3 overflow-x-auto border-t border-[var(--color-border)] px-3 text-[11px] text-[var(--color-fg-subtle)]">
        <span className="font-mono tabular-nums">{NODES.length} nós</span>
        <span className="hidden sm:inline">
          {META.counts.apiRoutes} APIs · {META.counts.pages} páginas · {META.counts.modules} módulos
        </span>
        <span className="hidden md:inline truncate">
          {crumbs.length
            ? crumbs.map((c) => c.name).join(" / ")
            : view === "flow" && flow
              ? flow.name
              : VIEW_LABEL[view as ViewId]}
        </span>
        <span className="ml-auto hidden truncate font-mono sm:inline">
          {META.repo} · auditado {META.auditedAt}
        </span>
      </footer>

      <CommandSearch />
      <HelpDialog />
    </div>
  );
}
