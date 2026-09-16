"use client";

import {
  DOMAIN_LABEL,
  FLOWS,
  LAYERS,
  LAYER_LABEL,
  NODES,
  STATUSES,
  STATUS_LABEL,
  VIEWS,
  VIEW_LABEL,
} from "@/modules/architecture-explorer/lib/architecture";
import { useExplorer } from "@/modules/architecture-explorer/store/explorer";

const DOMAINS = ["product", "ops", "ai", "data", "events", "integrations", "infra", "security", "quality", "stack"];

export function SideNav() {
  const view = useExplorer((s) => s.view);
  const setView = useExplorer((s) => s.setView);
  const scope = useExplorer((s) => s.scope);
  const setScope = useExplorer((s) => s.setScope);
  const hiddenDomains = useExplorer((s) => s.hiddenDomains);
  const toggleDomain = useExplorer((s) => s.toggleDomain);
  const layers = useExplorer((s) => s.layers);
  const toggleLayer = useExplorer((s) => s.toggleLayer);
  const statuses = useExplorer((s) => s.statuses);
  const toggleStatus = useExplorer((s) => s.toggleStatus);
  const selectedFlow = useExplorer((s) => s.selectedFlow);
  const setFlow = useExplorer((s) => s.setFlow);
  const showEdges = useExplorer((s) => s.showEdges);
  const toggleEdges = useExplorer((s) => s.toggleEdges);
  const resetExpanded = useExplorer((s) => s.resetExpanded);

  const counts = DOMAINS.map((d) => ({
    id: d,
    n: NODES.filter((n) => n.domain === d && (scope === "full" || n.mvp || n.kind === "domain")).length,
  }));

  return (
    <nav className="scrollbar-thin flex h-full min-h-0 flex-col overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <div className="border-b border-[var(--color-border)] px-3 py-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">Escopo</p>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] p-1">
          {(["mvp", "full"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium ${
                scope === s ? "bg-[var(--color-bg-elevated)] text-[var(--color-fg)] shadow-sm" : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              {s === "mvp" ? "MVP" : "Sistema"}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-[var(--color-border)] px-3 py-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">Visão</p>
        <ul className="mt-2 space-y-0.5">
          {VIEWS.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => setView(v)}
                className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm ${
                  view === v ? "bg-[var(--color-bg-hover)] text-[var(--color-fg)]" : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg)]"
                }`}
              >
                {VIEW_LABEL[v]}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-b border-[var(--color-border)] px-3 py-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">Fluxos</p>
        <ul className="mt-2 space-y-0.5">
          {FLOWS.filter((f) => scope === "full" || f.mvp).map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => {
                  setView("flow");
                  setFlow(f.id);
                }}
                className={`w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm ${
                  selectedFlow === f.id && view === "flow"
                    ? "bg-[var(--color-bg-hover)] text-[var(--color-fg)]"
                    : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg)]"
                }`}
              >
                {f.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-b border-[var(--color-border)] px-3 py-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">Domínios</p>
        <ul className="mt-2 space-y-0.5">
          {counts.map(({ id, n }) => (
            <li key={id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg)]">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--color-accent)]"
                  checked={!hiddenDomains[id]}
                  onChange={() => toggleDomain(id)}
                />
                <span className="flex-1 truncate">{DOMAIN_LABEL[id] ?? id}</span>
                <span className="font-mono text-[10px] text-[var(--color-fg-subtle)] tabular-nums">{n}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-b border-[var(--color-border)] px-3 py-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">Camada</p>
        <ul className="mt-2 space-y-0.5">
          {LAYERS.map((l) => (
            <li key={l}>
              <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)]">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--color-accent)]"
                  checked={layers[l] !== false}
                  onChange={() => toggleLayer(l)}
                />
                {LAYER_LABEL[l]}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-b border-[var(--color-border)] px-3 py-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">Status</p>
        <ul className="mt-2 space-y-0.5">
          {STATUSES.map((st) => (
            <li key={st}>
              <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)]">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--color-accent)]"
                  checked={statuses[st] !== false}
                  onChange={() => toggleStatus(st)}
                />
                {STATUS_LABEL[st]}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto space-y-1 px-3 py-3">
        <button
          type="button"
          onClick={toggleEdges}
          className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg)]"
        >
          {showEdges ? "Ocultar conexões" : "Mostrar conexões"}
        </button>
        <button
          type="button"
          onClick={resetExpanded}
          className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg)]"
        >
          Recolher para visão geral
        </button>
      </div>
    </nav>
  );
}
