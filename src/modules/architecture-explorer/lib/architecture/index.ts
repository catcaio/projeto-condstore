import { childrenOf, dependentsOf, EDGES, FLOWS, META, NODES } from "./catalog";
import type { ArchNode, Layer, NodeStatus, ViewId } from "./types";

export * from "./types";
export { childrenOf, dependentsOf, EDGES, FLOWS, META, NODES } from "./catalog";
export * from "./layout";

export function nodeById(id: string): ArchNode | undefined {
  return NODES.find((n) => n.id === id);
}

export function ancestors(id: string): ArchNode[] {
  const out: ArchNode[] = [];
  let cur = nodeById(id);
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.parentId)) {
    seen.add(cur.parentId);
    const p = nodeById(cur.parentId);
    if (!p) break;
    out.unshift(p);
    cur = p;
  }
  return out;
}

export function searchNodes(query: string): ArchNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return NODES.filter((n) => {
    const hay = [
      n.name,
      n.id,
      n.kind,
      n.domain,
      n.description,
      n.path,
      n.evidence,
      ...n.tags,
      ...n.technologies,
      ...n.relatedFiles,
      ...n.responsibilities,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }).slice(0, 40);
}

export function visibleNodes(opts: {
  scope: "mvp" | "full";
  view: ViewId;
  hiddenDomains: Record<string, boolean>;
  layers: Record<Layer, boolean>;
  statuses: Record<NodeStatus, boolean>;
}): ArchNode[] {
  const { scope, view, hiddenDomains, layers, statuses } = opts;

  let list = NODES.filter((n) => {
    if (scope === "mvp" && !n.mvp && n.status !== "out_of_scope") {
      if (n.kind === "system" || n.kind === "domain") return true;
      return false;
    }
    if (hiddenDomains[n.domain]) return false;
    if (layers[n.layer] === false) return false;
    if (statuses[n.status] === false) return false;
    return true;
  });

  if (view === "data") {
    list = list.filter(
      (n) => n.kind === "entity" || n.kind === "system" || n.domain === "data" || n.id === "os",
    );
  } else if (view === "integrations") {
    list = list.filter(
      (n) => n.kind === "integration" || n.kind === "system" || n.domain === "integrations" || n.id === "os",
    );
  } else if (view === "ai") {
    list = list.filter((n) => n.domain === "ai" || n.layer === "ai" || n.kind === "system" || n.id === "os");
  } else if (view === "infra") {
    list = list.filter(
      (n) =>
        n.domain === "infra" ||
        n.domain === "quality" ||
        n.kind === "infra" ||
        n.kind === "worker" ||
        n.kind === "system" ||
        n.id === "os",
    );
  } else if (view === "tenant") {
    list = list.filter(
      (n) =>
        n.domain === "security" ||
        n.id === "os" ||
        n.id === "middleware" ||
        n.kind === "system",
    );
  } else if (view === "stack") {
    list = list.filter((n) => n.kind === "tech" || n.domain === "stack" || n.id === "os");
  } else if (view === "dependencies") {
    list = list.filter(
      (n) =>
        n.kind === "module" ||
        n.kind === "service" ||
        n.kind === "integration" ||
        n.kind === "system" ||
        n.kind === "api" ||
        n.kind === "domain",
    );
  }

  return list;
}

export function defaultExpanded(view: ViewId, scope: "mvp" | "full"): Set<string> {
  const set = new Set<string>(["os"]);
  const domains = NODES.filter((n) => n.kind === "domain" && n.parentId === "os");
  for (const d of domains) {
    if (scope === "mvp" && !d.mvp && !["ops", "product", "security", "infra", "data"].includes(d.id)) {
      continue;
    }
    set.add(d.id);
  }
  if (view === "ai") {
    set.add("ai");
    for (const c of childrenOf("ai")) set.add(c.id);
  }
  if (view === "data") {
    set.add("data");
    for (const c of childrenOf("data")) set.add(c.id);
  }
  if (view === "integrations") set.add("integrations");
  if (view === "infra") {
    set.add("infra");
    set.add("quality");
  }
  if (view === "tenant") set.add("security");
  if (view === "stack") set.add("stack");
  return set;
}

export { EDGES as ALL_EDGES, FLOWS as ALL_FLOWS, META as ARCH_META };
