"use client";

import type { ReactNode } from "react";
import {
  ancestors,
  childrenOf,
  dependentsOf,
  FLOWS,
  githubUrl,
  KIND_LABEL,
  LAYER_LABEL,
  nodeById,
  STATUS_LABEL,
} from "@/modules/architecture-explorer/lib/architecture";
import { useExplorer } from "@/modules/architecture-explorer/store/explorer";
import { ExternalLink, FolderGit2, GitBranch, Waypoints, X } from "lucide-react";

const STATUS_DOT: Record<string, string> = {
  production: "bg-status-production",
  partial: "bg-status-partial",
  implemented: "bg-status-implemented",
  experimental: "bg-status-experimental",
  planned: "bg-status-planned",
  out_of_scope: "bg-status-out",
  unconfirmed: "bg-status-unconfirmed",
};

export function Inspector() {
  const selectedId = useExplorer((s) => s.selectedId);
  const select = useExplorer((s) => s.select);
  const expandTo = useExplorer((s) => s.expandTo);
  const requestCenter = useExplorer((s) => s.requestCenter);
  const setInspectorOpen = useExplorer((s) => s.setInspectorOpen);
  const setFlow = useExplorer((s) => s.setFlow);
  const setView = useExplorer((s) => s.setView);

  const node = selectedId ? nodeById(selectedId) : undefined;
  const crumbs = node ? [...ancestors(node.id), node] : [];
  const deps = node ? node.dependencies.map(nodeById).filter(Boolean) : [];
  const usedBy = node ? dependentsOf(node.id).map(nodeById).filter(Boolean) : [];
  const kids = node ? childrenOf(node.id) : [];
  const relatedFlows = node ? FLOWS.filter((f) => f.steps.some((s) => s.nodeId === node.id)) : [];

  const jump = (id: string) => {
    expandTo([...ancestors(id).map((a) => a.id), id]);
    select(id);
    requestCenter(id);
  };

  if (!node) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">Sobre</p>
            <h2 className="text-sm font-medium text-[var(--color-fg)]">CONDSTORE OS</h2>
          </div>
        </header>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm text-[var(--color-fg-muted)]">
          <p className="text-pretty leading-relaxed">
            Selecione um nó no mapa para ver proveniência: caminho no repositório, evidência, dependências e arquivos.
          </p>
          <p className="mt-3 text-pretty leading-relaxed">
            Fonte da verdade: código em{" "}
            <a
              className="text-[var(--color-fg)] underline decoration-[var(--color-border-strong)] underline-offset-2"
              href="https://github.com/catcaio/projeto-condstore"
              target="_blank"
              rel="noreferrer"
            >
              catcaio/projeto-condstore
            </a>
            .
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <header className="flex items-start justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">Sobre este nó</p>
          <h2 className="truncate text-base font-medium tracking-tight text-[var(--color-fg)]">{node.name}</h2>
        </div>
        <button
          type="button"
          className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg)]"
          onClick={() => {
            select(null);
            setInspectorOpen(false);
          }}
          aria-label="Fechar painel"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-fg-muted)]">
            <span className={`size-1.5 rounded-full ${STATUS_DOT[node.status]}`} />
            {STATUS_LABEL[node.status]}
          </span>
          <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-fg-muted)]">
            {KIND_LABEL[node.kind]}
          </span>
          <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-fg-muted)]">
            {LAYER_LABEL[node.layer]}
          </span>
          {node.mvp ? (
            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-fg-muted)]">MVP</span>
          ) : (
            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-fg-subtle)]">Fora do MVP</span>
          )}
        </div>

        <nav className="mt-3 flex flex-wrap items-center gap-1 text-[11px] text-[var(--color-fg-subtle)]">
          {crumbs.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <button type="button" className="hover:text-[var(--color-fg)]" onClick={() => jump(c.id)}>
                {c.name}
              </button>
            </span>
          ))}
        </nav>

        <p className="mt-4 text-pretty text-sm leading-relaxed text-[var(--color-fg-muted)]">{node.description}</p>

        {node.path && node.github && (
          <a
            href={node.github}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 font-mono text-[11px] text-[var(--color-fg)] hover:border-[var(--color-border-strong)]"
          >
            <FolderGit2 className="size-3.5 shrink-0 text-[var(--color-fg-muted)]" />
            <span className="min-w-0 truncate">{node.path}</span>
            <ExternalLink className="ml-auto size-3 shrink-0 text-[var(--color-fg-subtle)]" />
          </a>
        )}

        <Section title="Evidência">{node.evidence}</Section>

        {node.responsibilities.length > 0 && (
          <Section title="Responsabilidades">
            <ul className="space-y-1">
              {node.responsibilities.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--color-fg-subtle)]" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {node.technologies.length > 0 && (
          <Section title="Tecnologias">
            <div className="flex flex-wrap gap-1.5">
              {node.technologies.map((t) => (
                <span key={t} className="rounded-[var(--radius-xs)] bg-[var(--color-bg-subtle)] px-2 py-0.5 font-mono text-[11px]">
                  {t}
                </span>
              ))}
            </div>
          </Section>
        )}

        {deps.length > 0 && (
          <Section title="Depende de">
            <LinkList items={deps as NonNullable<ReturnType<typeof nodeById>>[]} onJump={jump} />
          </Section>
        )}

        {usedBy.length > 0 && (
          <Section title="Utilizado por">
            <LinkList items={usedBy as NonNullable<ReturnType<typeof nodeById>>[]} onJump={jump} />
          </Section>
        )}

        {kids.length > 0 && (
          <Section title="Contém">
            <LinkList items={kids} onJump={jump} />
          </Section>
        )}

        {node.relatedFiles.length > 0 && (
          <Section title="Arquivos relacionados">
            <ul className="space-y-1">
              {node.relatedFiles.map((f) => (
                <li key={f}>
                  <a
                    href={githubUrl(f)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                  >
                    <GitBranch className="size-3" />
                    <span className="truncate">{f}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {relatedFlows.length > 0 && (
          <Section title="Fluxos">
            <ul className="space-y-1">
              {relatedFlows.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-left text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                    onClick={() => {
                      setView("flow");
                      setFlow(f.id);
                    }}
                  >
                    <Waypoints className="size-3.5" />
                    {f.name}
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[11px] font-medium tracking-[0.12em] text-[var(--color-fg-subtle)] uppercase">{title}</h3>
      <div className="text-sm leading-relaxed text-[var(--color-fg-muted)]">{children}</div>
    </section>
  );
}

function LinkList({
  items,
  onJump,
}: {
  items: NonNullable<ReturnType<typeof nodeById>>[];
  onJump: (id: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map((n) => (
        <li key={n.id}>
          <button type="button" className="text-left text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]" onClick={() => onJump(n.id)}>
            {n.name}
            <span className="ml-1.5 font-mono text-[10px] text-[var(--color-fg-subtle)]">{KIND_LABEL[n.kind]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
