import { childrenOf, NODES } from "./catalog";
import type { ArchNode, ViewId } from "./types";

export type Point = { x: number; y: number };
export type NodeBox = { id: string; x: number; y: number; w: number; h: number };

const NODE_W = 196;
const NODE_H = 58;
const COL_GAP = 36;
const ROW_GAP = 28;

export function nodeSize(node: ArchNode): { w: number; h: number } {
  if (node.kind === "system") return { w: 228, h: 68 };
  if (node.kind === "domain") return { w: 210, h: 62 };
  return { w: NODE_W, h: NODE_H };
}

function layoutTree(
  roots: ArchNode[],
  expanded: Set<string>,
  allowed: Set<string>,
  origin: Point,
  horizontal: boolean,
): NodeBox[] {
  const boxes: NodeBox[] = [];

  const place = (id: string, x: number, y: number): number => {
    const node = NODES.find((n) => n.id === id);
    if (!node || !allowed.has(id)) return 0;
    const { w, h } = nodeSize(node);
    const kids = childrenOf(id).filter((c) => allowed.has(c.id));
    const open = expanded.has(id) && kids.length > 0;
    if (!open) {
      boxes.push({ id, x, y, w, h });
      return horizontal ? h : w;
    }
    let cursor = horizontal ? y : x;
    for (const k of kids) {
      const span = place(
        k.id,
        horizontal ? x + w + COL_GAP : cursor,
        horizontal ? cursor : y + h + ROW_GAP,
      );
      cursor += span + (horizontal ? ROW_GAP : COL_GAP);
    }
    const total = cursor - (horizontal ? y : x) - (horizontal ? ROW_GAP : COL_GAP);
    const mid = (horizontal ? y : x) + Math.max(total, horizontal ? h : w) / 2;
    boxes.push({
      id,
      x: horizontal ? x : mid - w / 2,
      y: horizontal ? mid - h / 2 : y,
      w,
      h,
    });
    return Math.max(total, horizontal ? h : w);
  };

  let cursor = horizontal ? origin.y : origin.x;
  for (const r of roots) {
    const span = place(r.id, horizontal ? origin.x : cursor, horizontal ? cursor : origin.y);
    cursor += span + (horizontal ? 56 : 48);
  }
  return boxes;
}

function layoutColumns(groups: ArchNode[][], origin: Point): NodeBox[] {
  const boxes: NodeBox[] = [];
  groups.forEach((group, gi) => {
    const gx = origin.x + gi * (NODE_W + 72);
    group.forEach((node, ni) => {
      const { w, h } = nodeSize(node);
      boxes.push({
        id: node.id,
        x: gx,
        y: origin.y + ni * (h + 18),
        w,
        h,
      });
    });
  });
  return boxes;
}

function layoutRadial(center: ArchNode, satellites: ArchNode[], origin: Point): NodeBox[] {
  const boxes: NodeBox[] = [];
  const c = nodeSize(center);
  boxes.push({ id: center.id, x: origin.x - c.w / 2, y: origin.y - c.h / 2, w: c.w, h: c.h });
  const n = Math.max(satellites.length, 1);
  const radius = 280 + Math.min(n, 16) * 8;
  satellites.forEach((node, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const { w, h } = nodeSize(node);
    boxes.push({
      id: node.id,
      x: origin.x + Math.cos(angle) * radius - w / 2,
      y: origin.y + Math.sin(angle) * radius - h / 2,
      w,
      h,
    });
  });
  return boxes;
}

export function layoutGraph(
  view: ViewId,
  visible: ArchNode[],
  expanded: Set<string>,
): NodeBox[] {
  const allowed = new Set(visible.map((n) => n.id));
  const os = visible.find((n) => n.id === "os");

  if (view === "integrations") {
    const hub = visible.find((n) => n.id === "os") ?? visible[0];
    const sats = visible.filter((n) => n.kind === "integration" || n.id === "vercel");
    if (hub) return layoutRadial(hub, sats.filter((s) => s.id !== hub.id), { x: 720, y: 420 });
  }

  if (view === "ai") {
    const frank = visible.find((n) => n.id === "ai") ?? os;
    if (frank) {
      const inner = new Set(expanded);
      inner.add(frank.id);
      return layoutTree([frank], inner, allowed, { x: 80, y: 80 }, true);
    }
  }

  if (view === "data") {
    const groups = visible.filter((n) => n.tags.includes("table-group"));
    const columns = groups.map((g) => [g, ...visible.filter((n) => n.parentId === g.id)]);
    if (os) columns.unshift([os]);
    return layoutColumns(columns.length ? columns : [visible], { x: 48, y: 64 });
  }

  if (view === "stack") {
    return layoutTree(
      visible.filter((n) => n.id === "stack" || n.id === "os"),
      new Set(["os", "stack", ...expanded]),
      allowed,
      { x: 80, y: 80 },
      true,
    );
  }

  if (view === "infra" || view === "tenant") {
    const roots = visible.filter((n) => n.id === "infra" || n.id === "security" || n.id === "os");
    return layoutTree(roots.length ? roots : visible.slice(0, 1), expanded, allowed, { x: 64, y: 48 }, true);
  }

  if (view === "dependencies") {
    const modules = visible.filter(
      (n) => n.kind === "module" || n.kind === "service" || n.kind === "integration" || n.kind === "system",
    );
    const byDomain = new Map<string, ArchNode[]>();
    for (const n of modules) {
      const list = byDomain.get(n.domain) ?? [];
      list.push(n);
      byDomain.set(n.domain, list);
    }
    return layoutColumns([...byDomain.values()], { x: 40, y: 56 });
  }

  if (os) {
    return layoutTree([os], expanded, allowed, { x: 48, y: 36 }, true);
  }
  return layoutTree(visible.slice(0, 1), expanded, allowed, { x: 48, y: 36 }, true);
}

export function boundsOf(boxes: NodeBox[]): { x: number; y: number; w: number; h: number } {
  if (!boxes.length) return { x: 0, y: 0, w: 1200, h: 800 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const pad = 120;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

export function elbow(a: NodeBox, b: NodeBox): string {
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  const mx = x1 + Math.max(18, (x2 - x1) / 2);
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function straight(a: NodeBox, b: NodeBox): string {
  const x1 = a.x + a.w / 2;
  const y1 = a.y + a.h / 2;
  const x2 = b.x + b.w / 2;
  const y2 = b.y + b.h / 2;
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

export { NODE_W, NODE_H };
