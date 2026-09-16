"use client";

import "@/modules/architecture-explorer/explorer.css";
import { META, NODES, FLOWS, VIEW_LABEL, VIEWS } from "@/modules/architecture-explorer/lib/architecture";

export default function Sitemap2Page() {
  const domains = NODES.filter((n) => n.kind === "domain");
  const modules = NODES.filter((n) => n.kind === "module" || n.kind === "service");
  const integrations = NODES.filter((n) => n.kind === "integration");

  return (
    <div className="explorer-root min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <header className="border-b border-[var(--color-border)] px-6 py-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-[var(--color-fg-subtle)] uppercase">
          Architecture Explorer
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{META.product}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-fg-muted)]">
          Mapa público da arquitetura real do CondStore. Inventário auditado a partir do código
          (não de roadmap). Rota: <code className="rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-xs">/sitemap2</code>
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat label="Nós no catálogo" value={String(NODES.length)} />
          <Stat label="Domínios" value={String(domains.length)} />
          <Stat label="Fluxos" value={String(FLOWS.length)} />
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium tracking-wide text-[var(--color-fg-subtle)] uppercase">
            Domínios
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {domains.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{d.name}</span>
                  <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-fg-muted)]">
                    {d.status}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-fg-muted)]">{d.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium tracking-wide text-[var(--color-fg-subtle)] uppercase">
            Módulos e serviços
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {modules.map((m) => (
              <li
                key={m.id}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-1 text-xs"
              >
                {m.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium tracking-wide text-[var(--color-fg-subtle)] uppercase">
            Integrações
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {integrations.map((i) => (
              <li
                key={i.id}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-1 text-xs"
              >
                {i.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium tracking-wide text-[var(--color-fg-subtle)] uppercase">
            Views disponíveis (mapa interativo em breve)
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {VIEWS.map((v) => (
              <li
                key={v}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-fg-muted)]"
              >
                {VIEW_LABEL[v]}
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-16 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-fg-subtle)]">
          <p>
            Fonte: <a className="underline" href={META.repoUrl}>{META.repo}</a> · auditado {META.auditedAt}
          </p>
          <p className="mt-1">
            Explorer original:{" "}
            <a className="underline" href="https://github.com/caiora/earth-beam-arrow-plum">
              caiora/earth-beam-arrow-plum
            </a>
          </p>
          <p className="mt-1">PR: #405 · dependência necessária: <code>zustand</code></p>
        </footer>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-4">
      <p className="text-[11px] tracking-wide text-[var(--color-fg-subtle)] uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
