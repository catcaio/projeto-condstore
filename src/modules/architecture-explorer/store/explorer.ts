"use client";

import { useSyncExternalStore } from "react";
import { defaultExpanded } from "@/modules/architecture-explorer/lib/architecture";
import type { Layer, NodeStatus, ViewId } from "@/modules/architecture-explorer/lib/architecture/types";
import { LAYERS, STATUSES } from "@/modules/architecture-explorer/lib/architecture/types";

const allLayers = Object.fromEntries(LAYERS.map((l) => [l, true])) as Record<Layer, boolean>;
const allStatuses = Object.fromEntries(STATUSES.map((s) => [s, true])) as Record<NodeStatus, boolean>;

export type Scope = "mvp" | "full";

export interface ExplorerState {
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

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

let state: ExplorerState = {
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
  setView: (view) => {
    state = {
      ...state,
      view,
      expanded: { ...state.expanded, ...expandedRecord(view, state.scope) },
    };
    emit();
  },
  setScope: (scope) => {
    state = {
      ...state,
      scope,
      expanded: { ...expandedRecord(state.view, scope), ...state.expanded },
    };
    emit();
  },
  select: (id) => {
    state = {
      ...state,
      selectedId: id,
      inspectorOpen: id ? true : state.inspectorOpen,
    };
    emit();
  },
  hover: (id) => {
    state = { ...state, hoveredId: id };
    emit();
  },
  toggleExpand: (id) => {
    state = { ...state, expanded: { ...state.expanded, [id]: !state.expanded[id] } };
    emit();
  },
  expandTo: (ids) => {
    const next = { ...state.expanded };
    for (const id of ids) next[id] = true;
    state = { ...state, expanded: next };
    emit();
  },
  resetExpanded: () => {
    state = { ...state, expanded: expandedRecord(state.view, state.scope) };
    emit();
  },
  toggleDomain: (domain) => {
    state = {
      ...state,
      hiddenDomains: { ...state.hiddenDomains, [domain]: !state.hiddenDomains[domain] },
    };
    emit();
  },
  toggleLayer: (layer) => {
    state = { ...state, layers: { ...state.layers, [layer]: !state.layers[layer] } };
    emit();
  },
  toggleStatus: (status) => {
    state = { ...state, statuses: { ...state.statuses, [status]: !state.statuses[status] } };
    emit();
  },
  setFlow: (id) => {
    state = { ...state, selectedFlow: id };
    emit();
  },
  toggleEdges: () => {
    state = { ...state, showEdges: !state.showEdges };
    emit();
  },
  toggleTheme: () => {
    state = { ...state, theme: state.theme === "dark" ? "light" : "dark" };
    emit();
  },
  setNavOpen: (navOpen) => {
    state = { ...state, navOpen };
    emit();
  },
  setInspectorOpen: (inspectorOpen) => {
    state = { ...state, inspectorOpen };
    emit();
  },
  setHelpOpen: (helpOpen) => {
    state = { ...state, helpOpen };
    emit();
  },
  setSearchOpen: (searchOpen) => {
    state = { ...state, searchOpen };
    emit();
  },
  requestCenter: (id) => {
    state = { ...state, centerRequest: { id, nonce: Date.now() } };
    emit();
  },
  hydrate: (partial) => {
    state = {
      ...state,
      ...partial,
      expanded: expandedRecord(partial.view ?? state.view, partial.scope ?? state.scope),
    };
    emit();
  },
};

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

/** Selector-compatible hook (zustand-like API, zero extra deps). */
export function useExplorer<T>(selector: (s: ExplorerState) => T): T {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector(snap);
}
