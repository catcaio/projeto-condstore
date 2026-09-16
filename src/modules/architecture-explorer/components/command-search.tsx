"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ancestors, KIND_LABEL, searchNodes } from "@/modules/architecture-explorer/lib/architecture";
import { useExplorer } from "@/modules/architecture-explorer/store/explorer";

export function CommandSearch() {
  const open = useExplorer((s) => s.searchOpen);
  const setSearchOpen = useExplorer((s) => s.setSearchOpen);
  const select = useExplorer((s) => s.select);
  const expandTo = useExplorer((s) => s.expandTo);
  const requestCenter = useExplorer((s) => s.requestCenter);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchNodes(q), [q]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQ("");
    }
  }, [open]);

  if (!open) return null;

  const go = (id: string) => {
    expandTo([...ancestors(id).map((a) => a.id), id]);
    select(id);
    requestCenter(id);
    setSearchOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--color-bg)]/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar no CondStore..."
          className="h-12 w-full border-b border-[var(--color-border)] bg-transparent px-4 text-sm text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-subtle)]"
          onKeyDown={(e) => {
            if (e.key === "Escape") setSearchOpen(false);
            if (e.key === "Enter" && results[0]) go(results[0].id);
          }}
        />
        <ul className="scrollbar-thin max-h-80 overflow-y-auto py-1">
          {q && results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-[var(--color-fg-subtle)]">Nenhum componente encontrado.</li>
          )}
          {results.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-bg-hover)]"
                onClick={() => go(n.id)}
              >
                <span className="mt-0.5 font-mono text-[10px] tracking-wide text-[var(--color-fg-subtle)]">{KIND_LABEL[n.kind]}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-[var(--color-fg)]">{n.name}</span>
                  <span className="block truncate font-mono text-[11px] text-[var(--color-fg-subtle)]">{n.path ?? n.id}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
