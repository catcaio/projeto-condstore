"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
  type WheelEvent,
} from "react";
import {
  ancestors,
  boundsOf,
  childrenOf,
  EDGES,
  elbow,
  FLOWS,
  layoutGraph,
  nodeById,
  straight,
  visibleNodes,
  type ArchNode,
} from "@/modules/architecture-explorer/lib/architecture";
import type { NodeBox } from "@/modules/architecture-explorer/lib/architecture/layout";
import { useExplorer } from "@/modules/architecture-explorer/store/explorer";

const DOMAIN_COLOR: Record<string, string> = {
  os: "var(--color-accent)",
  product: "var(--color-domain-product)",
  ops: "var(--color-domain-ops)",
  ai: "var(--color-domain-ai)",
  data: "var(--color-domain-data)",
  events: "var(--color-domain-events)",
  integrations: "var(--color-domain-integrations)",
  infra: "var(--color-domain-infra)",
  security: "var(--color-domain-security)",
  quality: "var(--color-domain-quality)",
  stack: "var(--color-domain-infra)",
};

const STATUS_COLOR: Record<string, string> = {
  production: "var(--color-status-production)",
  partial: "var(--color-status-partial)",
  implemented: "var(--color-status-implemented)",
  experimental: "var(--color-status-experimental)",
  planned: "var(--color-status-planned)",
  out_of_scope: "var(--color-status-out)",
  unconfirmed: "var(--color-status-unconfirmed)",
};

function isVisibleInTree(
  node: ArchNode,
  expanded: Record<string, boolean>,
  allowed: Set<string>,
): boolean {
  if (!allowed.has(node.id)) return false;
  if (!node.parentId) return true;
  let p: string | null = node.parentId;
  const seen = new Set<string>();
  while (p && !seen.has(p)) {
    seen.add(p);
    if (!allowed.has(p)) return false;
    if (!expanded[p]) return false;
    p = nodeById(p)?.parentId ?? null;
  }
  return true;
}

export function GraphCanvas() {
  const view = useExplorer((s) => s.view);
  const scope = useExplorer((s) => s.scope);
  const expanded = useExplorer((s) => s.expanded);
  const hiddenDomains = useExplorer((s) => s.hiddenDomains);
  const layers = useExplorer((s) => s.layers);
  const statuses = useExplorer((s) => s.statuses);
  const selectedId = useExplorer((s) => s.selectedId);
  const hoveredId = useExplorer((s) => s.hoveredId);
  const selectedFlow = useExplorer((s) => s.selectedFlow);
  const showEdges = useExplorer((s) => s.showEdges);
  const select = useExplorer((s) => s.select);
  const hover = useExplorer((s) => s.hover);
  const toggleExpand = useExplorer((s) => s.toggleExpand);
  const expandTo = useExplorer((s) => s.expandTo);
  const centerRequest = useExplorer((s) => s.centerRequest);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState({ x: 24, y: 24, k: 0.82 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const dragRef = useRef<{
    mode: "pan" | "node";
    id?: string;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const pinchRef = useRef<{ dist: number; k: number } | null>(null);

  const allowedList = useMemo(
    () => visibleNodes({ scope, view, hiddenDomains, layers, statuses }),
    [scope, view, hiddenDomains, layers, statuses],
  );
  const allowed = useMemo(() => new Set(allowedList.map((n) => n.id)), [allowedList]);

  const expandedSet = useMemo(() => {
    const s = new Set<string>();
    for (const [id, on] of Object.entries(expanded)) if (on) s.add(id);
    return s;
  }, [expanded]);

  const treeVisible = useMemo(
    () => allowedList.filter((n) => isVisibleInTree(n, expanded, allowed)),
    [allowedList, expanded, allowed],
  );

  const layoutBoxes = useMemo(
    () => layoutGraph(view, treeVisible, expandedSet),
    [view, treeVisible, expandedSet],
  );

  const boxes = useMemo(() => {
    return layoutBoxes.map((b) => {
      const o = overrides[b.id];
      return o ? { ...b, x: o.x, y: o.y } : b;
    });
  }, [layoutBoxes, overrides]);

  const boxMap = useMemo(() => {
    const m = new Map<string, NodeBox>();
    for (const b of boxes) m.set(b.id, b);
    return m;
  }, [boxes]);

  const flow = FLOWS.find((f) => f.id === selectedFlow);
  const flowIds = useMemo(() => new Set(flow?.steps.map((s) => s.nodeId) ?? []), [flow]);

  const connected = useMemo(() => {
    const focus = selectedId ?? hoveredId;
    if (!focus) return new Set<string>();
    const s = new Set<string>([focus]);
    for (const e of EDGES) {
      if (e.source === focus) s.add(e.target);
      if (e.target === focus) s.add(e.source);
    }
    return s;
  }, [selectedId, hoveredId]);

  const world = useMemo(() => boundsOf(boxes), [boxes]);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const k = Math.min(w / world.w, h / world.h, 1.15) * 0.92;
    setCam({
      x: (w - world.w * k) / 2 - world.x * k,
      y: (h - world.h * k) / 2 - world.y * k,
      k,
    });
  }, [world]);

  useEffect(() => {
    fit();
  }, [view, scope, fit]);

  useEffect(() => {
    if (!centerRequest) return;
    const b = boxMap.get(centerRequest.id);
    const el = wrapRef.current;
    if (!b || !el) return;
    const { k } = camRef.current;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setCam({
      x: w / 2 - (b.x + b.w / 2) * k,
      y: h / 2 - (b.y + b.h / 2) * k,
      k,
    });
  }, [centerRequest, boxMap]);

  const zoomAt = useCallback((mx: number, my: number, factor: number) => {
    const c = camRef.current;
    const next = Math.min(2.6, Math.max(0.22, c.k * factor));
    const wx = (mx - c.x) / c.k;
    const wy = (my - c.y) / c.k;
    setCam({ x: mx - wx * next, y: my - wy * next, k: next });
  }, []);

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY > 0 ? 0.92 : 1.08);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.button === 2 || e.currentTarget === e.target) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, ox: cam.x, oy: cam.y };
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === "pan") {
      setCam((c) => ({ ...c, x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) }));
    } else if (d.id) {
      const dx = (e.clientX - d.sx) / cam.k;
      const dy = (e.clientY - d.sy) / cam.k;
      setOverrides((o) => ({ ...o, [d.id!]: { x: d.ox + dx, y: d.oy + dy } }));
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      pinchRef.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        k: cam.k,
      };
    }
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const a = e.touches[0];
      const b = e.touches[1];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const factor = dist / pinchRef.current.dist;
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = (a.clientX + b.clientX) / 2 - rect.left;
      const my = (a.clientY + b.clientY) / 2 - rect.top;
      const c = camRef.current;
      const next = Math.min(2.6, Math.max(0.22, pinchRef.current.k * factor));
      const wx = (mx - c.x) / c.k;
      const wy = (my - c.y) / c.k;
      setCam({ x: mx - wx * next, y: my - wy * next, k: next });
    }
  };

  const visibleEdges = useMemo(() => {
    if (!showEdges) return [];
    return EDGES.filter((e) => boxMap.has(e.source) && boxMap.has(e.target)).filter((e) => {
      if (view === "architecture" && e.type !== "contains") return false;
      if (view === "dependencies" && e.type === "contains") return false;
      if (view === "flow") return false;
      if (view === "data") return e.type === "contains" || e.type === "persists";
      if (view === "integrations") return e.type === "integrates" || e.type === "contains";
      return true;
    });
  }, [boxMap, showEdges, view]);

  const flowPath = useMemo(() => {
    if (view !== "flow" || !flow) return [];
    const pts: NodeBox[] = [];
    for (const step of flow.steps) {
      const box = boxMap.get(step.nodeId);
      if (box) pts.push(box);
    }
    return pts;
  }, [view, flow, boxMap]);

  const dimmed = Boolean(selectedId || (view === "flow" && flow));

  const onNodeClick = (node: ArchNode, e: MouseEvent) => {
    e.stopPropagation();
    select(node.id);
    const kids = childrenOf(node.id);
    if (kids.length && !expanded[node.id]) toggleExpand(node.id);
  };

  const onNodeDoubleClick = (node: ArchNode, e: MouseEvent) => {
    e.stopPropagation();
    toggleExpand(node.id);
    expandTo(ancestors(node.id).map((a) => a.id));
  };

  const startNodeDrag = (id: string, e: PointerEvent, box: NodeBox) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode: "node", id, sx: e.clientX, sy: e.clientY, ox: box.x, oy: box.y };
  };

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <div
        ref={wrapRef}
        className="explorer-grid absolute inset-0 touch-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => select(null)}
      >
        <svg className="absolute inset-0 h-full w-full" aria-label="Mapa arquitetural do CondStore">
          <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
            {visibleEdges.map((e) => {
              const a = boxMap.get(e.source);
              const b = boxMap.get(e.target);
              if (!a || !b) return null;
              const focus = selectedId ?? hoveredId;
              const hot =
                !focus ||
                e.source === focus ||
                e.target === focus ||
                (flowIds.has(e.source) && flowIds.has(e.target));
              const d = view === "architecture" || e.type === "contains" ? elbow(a, b) : straight(a, b);
              return (
                <path
                  key={e.id}
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  className="text-[var(--color-fg)]"
                  strokeOpacity={hot ? 0.45 : dimmed ? 0.06 : 0.16}
                  strokeWidth={hot ? 1.6 : 1}
                  strokeLinecap="round"
                />
              );
            })}

            {flowPath.length > 1 &&
              flowPath.slice(0, -1).map((a, i) => {
                const b = flowPath[i + 1];
                return (
                  <path
                    key={`flow-${i}`}
                    d={straight(a, b)}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={2.2}
                    strokeOpacity={0.85}
                  />
                );
              })}

            {boxes.map((b) => {
              const node = nodeById(b.id);
              if (!node) return null;
              const kids = childrenOf(node.id).filter((c) => allowed.has(c.id));
              const isSel = selectedId === node.id;
              const isHov = hoveredId === node.id;
              const inFlow = flowIds.has(node.id);
              const hot = !dimmed || connected.has(node.id) || inFlow || isSel;
              const color = DOMAIN_COLOR[node.domain] ?? "var(--color-accent)";
              const status = STATUS_COLOR[node.status];
              const label = node.name.length > 24 ? `${node.name.slice(0, 22)}…` : node.name;
              const meta = node.path ? node.path.split("/").slice(-2).join("/") : "";
              return (
                <g
                  key={node.id}
                  transform={`translate(${b.x} ${b.y})`}
                  opacity={hot ? 1 : 0.22}
                  onPointerDown={(e) => startNodeDrag(node.id, e, b)}
                  onClick={(e) => onNodeClick(node, e)}
                  onDoubleClick={(e) => onNodeDoubleClick(node, e)}
                  onPointerEnter={() => hover(node.id)}
                  onPointerLeave={() => hover(null)}
                  className="cursor-pointer"
                >
                  <rect
                    width={b.w}
                    height={b.h}
                    rx={10}
                    fill="var(--color-bg-elevated)"
                    stroke={isSel ? "var(--color-accent)" : isHov ? color : "var(--color-border-strong)"}
                    strokeWidth={isSel ? 1.8 : 1}
                  />
                  <rect width={4} height={b.h} rx={2} fill={color} />
                  <circle cx={16} cy={16} r={4} fill={status} />
                  <text
                    x={26}
                    y={20}
                    fill="var(--color-fg)"
                    fontSize={node.kind === "system" ? 14 : 12}
                    fontWeight={500}
                    fontFamily="IBM Plex Sans, sans-serif"
                  >
                    {label}
                  </text>
                  <text
                    x={16}
                    y={40}
                    fill="var(--color-fg-muted)"
                    fontSize={9}
                    fontFamily="IBM Plex Mono, monospace"
                    letterSpacing="0.04em"
                  >
                    {node.kind.toUpperCase()}
                    {meta ? `  ·  ${meta}` : ""}
                  </text>
                  {kids.length > 0 && (
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(node.id);
                      }}
                    >
                      <circle
                        cx={b.w - 16}
                        cy={b.h / 2}
                        r={9}
                        fill="var(--color-bg-subtle)"
                        stroke="var(--color-border-strong)"
                      />
                      <text
                        x={b.w - 16}
                        y={b.h / 2 + 3}
                        textAnchor="middle"
                        fill="var(--color-fg-muted)"
                        fontSize={10}
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        {expanded[node.id] ? "−" : String(kids.length)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/90 p-1 shadow-[var(--shadow-panel)] backdrop-blur-sm">
          <button
            type="button"
            className="h-9 w-9 rounded-[var(--radius-sm)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg)]"
            onClick={() => {
              const el = wrapRef.current;
              if (!el) return;
              zoomAt(el.clientWidth / 2, el.clientHeight / 2, 1.15);
            }}
            aria-label="Aproximar"
          >
            +
          </button>
          <button
            type="button"
            className="h-9 w-9 rounded-[var(--radius-sm)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg)]"
            onClick={() => {
              const el = wrapRef.current;
              if (!el) return;
              zoomAt(el.clientWidth / 2, el.clientHeight / 2, 0.87);
            }}
            aria-label="Afastar"
          >
            −
          </button>
          <button
            type="button"
            className="h-9 rounded-[var(--radius-sm)] px-3 text-xs font-medium text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg)]"
            onClick={fit}
          >
            Enquadrar
          </button>
        </div>
      </div>
    </div>
  );
}
