"use client";

import dynamic from "next/dynamic";

// Full explorer is being ported. For now render a self-contained status page
// that confirms the public route and points to the source work.
export default function SitemapPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 p-8 text-zinc-100">
      <div className="max-w-xl text-center">
        <p className="text-[11px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
          CondStore OS
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Architecture Explorer
        </h1>
        <p className="mt-4 text-pretty text-zinc-400">
          Página pública em <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-sm text-zinc-200">/sitemap</code>.
          O explorer interativo (grafo, views, Frank, multi-tenancy, filtro MVP,
          pesquisa global e deep-linking) está sendo portado do repositório
          de origem para este módulo.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <a
            href="https://github.com/caiora/earth-beam-arrow-plum"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            Fonte (earth-beam-arrow-plum)
          </a>
          <a
            href="https://github.com/catcaio/projeto-condstore/pull/405"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            PR #405
          </a>
        </div>
        <p className="mt-8 text-xs text-zinc-600">
          Core types + catalog already landed under{" "}
          <code className="text-zinc-500">src/modules/architecture-explorer</code>.
          Next commits will wire GraphCanvas, Inspector and Zustand store.
        </p>
      </div>
    </div>
  );
}
