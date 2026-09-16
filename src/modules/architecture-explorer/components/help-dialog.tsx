"use client";

import { useExplorer } from "@/modules/architecture-explorer/store/explorer";
import { X } from "lucide-react";

const ROWS: Array<[string, string]> = [
  ["/", "Pesquisar"],
  ["1–8", "Trocar visão"],
  ["M", "Alternar MVP / sistema completo"],
  ["E", "Expandir / recolher nó selecionado"],
  ["0", "Voltar à visão geral"],
  ["Esc", "Limpar seleção"],
  ["Scroll / pinça", "Zoom"],
  ["Arrastar fundo", "Pan"],
  ["Arrastar nó", "Reposicionar"],
  ["Clique", "Detalhes + destacar conexões"],
  ["Duplo clique", "Expandir ramo"],
];

export function HelpDialog() {
  const open = useExplorer((s) => s.helpOpen);
  const setHelpOpen = useExplorer((s) => s.setHelpOpen);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/60 p-4 backdrop-blur-sm" onClick={() => setHelpOpen(false)}>
      <div
        className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 shadow-[var(--shadow-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">Atalhos</p>
            <h2 className="text-lg font-medium tracking-tight">Como explorar</h2>
          </div>
          <button type="button" className="rounded-[var(--radius-sm)] p-1 text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg-hover)]" onClick={() => setHelpOpen(false)}>
            <X className="size-4" />
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {ROWS.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-4">
              <span className="text-[var(--color-fg-muted)]">{v}</span>
              <kbd className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-fg)]">
                {k}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-pretty text-xs leading-relaxed text-[var(--color-fg-subtle)]">
          O mapa nasce do repositório catcaio/projeto-condstore. Status sem evidência no código aparece como não
          confirmado. Frank existe no código mas o runtime está desligado no MVP.
        </p>
      </div>
    </div>
  );
}
