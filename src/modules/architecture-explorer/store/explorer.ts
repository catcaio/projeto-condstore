import { create } from "zustand";
import { defaultExpanded } from "@/modules/architecture-explorer/lib/architecture";
import type { Layer, NodeStatus, ViewId } from "@/modules/architecture-explorer/lib/architecture/types";
import { LAYERS, STATUSES } from "@/modules/architecture-explorer/lib/architecture/types";

const allLayers = Object.fromEntries(LAYERS.map((l) => [l, true])) as Record<Layer, boolean>;
const allStatuses = Object.fromEntries(STATUSES.map((s) => [s, true])) as Record<NodeStatus, boolean>;

export type Scope = "mvp" | "full";

interface ExplorerState {
  view: ViewId;
  scope: Scope;
  selectedId: string | null;
  hoveredId: string | null;
  expanded: Record<string, boolean>;
  hiddenDomains: Record<string, boolean>;
  layers: Record<Layer, boolean>;
  statuses: Record<NodeStatus, boolean>;
  selectedFlow: string | null;
  showEdges: boolean;
  theme: "dark" | "light";
  navOpen: boolean;
  inspectorOpen: boolean;
  helpOpen: boolean;
  searchOpen: boolean;
  centerRequest: { id: string; nonce: number } | null;
  setView: (view: ViewId) => void;
  setScope: (scope: Scope) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  toggleExpand: (id: string) => void;
  expandTo: (ids: string[]) => void;
  resetExpanded: () => void;
  toggleDomain: (domain: string) => void;
  toggleLayer: (layer: Layer) => void;
  toggleStatus: (status: NodeStatus) => void;
  setFlow: (id: string | null) => void;
  toggleEdges: () => void;
  toggleTheme: () => void;
  setNavOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  requestCenter: (id: string) => void;
  hydrate: (partial: Partial<Pick<ExplorerState, "view" | "scope" | "selectedId" | "selectedFlow">>) => void;
}

function expandedRecord(view: ViewId, scope: Scope): Record<string, boolean> {
  const rec: Record<string, boolean> = {};
  for (const id of defaultExpanded(view, scope)) rec[id] = true;
  return rec;
}

export const useExplorer = create<ExplorerState>((set, get) => ({
  view: "architecture",
  scope: "full",
  selectedId: null,
  hoveredId: null,
  expanded: expandedRecord("architecture", "full"),
  hiddenDomains: {},
  layers: { ...allLayers },
  statuses: { ...allStatuses },
  selectedFlow: "lead-to-delivery",
  showEdges: true,
  theme: "dark",
  navOpen: false,
  inspectorOpen: false,
  helpOpen: false,
  searchOpen: false,
  centerRequest: null,
  setView: (view) =>
    set({
      view,
      expanded: { ...get().expanded, ...expandedRecord(view, get().scope) },
    }),
  setScope: (scope) =>
    set({
      scope,
      expanded: { ...expandedRecord(get().view, scope), ...get().expanded },
    }),
  select: (id) =>
    set({
      selectedId: id,
      inspectorOpen: id ? true : get().inspectorOpen,
    }),
  hover: (id) => set({ hoveredId: id }),
  toggleExpand: (id) =>
    set((s) => ({ expanded: { ...s.expanded, [id]: !s.expanded[id] } })),
  expandTo: (ids) =>
    set((s) => {
      const next = { ...s.expanded };
      for (const id of ids) next[id] = true;
      return { expanded: next };
    }),
  resetExpanded: () => set({ expanded: expandedRecord(get().view, get().scope) }),
  toggleDomain: (domain) =>
    set((s) => ({ hiddenDomains: { ...s.hiddenDomains, [domain]: !s.hiddenDomains[domain] } })),
  toggleLayer: (layer) =>
    set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  toggleStatus: (status) =>
    set((s) => ({ statuses: { ...s.statuses, [status]: !s.statuses[status] } })),
  setFlow: (id) => set({ selectedFlow: id }),
  toggleEdges: () => set((s) => ({ showEdges: !s.showEdges })),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  setNavOpen: (navOpen) => set({ navOpen }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  requestCenter: (id) => set({ centerRequest: { id, nonce: Date.now() } }),
  hydrate: (partial) =>
    set({
      ...partial,
      expanded: expandedRecord(partial.view ?? get().view, partial.scope ?? get().scope),
    }),
}));
