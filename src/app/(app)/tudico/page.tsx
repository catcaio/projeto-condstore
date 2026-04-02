import { headers } from 'next/headers';

import { getTudicoMemoryState } from '@/modules/tudico/memory-store';
import { TudicoQueryPanel } from './tudico-query-panel';

export const metadata = {
  title: 'Tudico Hub — Pesquisa Estrutura Quântica-Relacional',
};

export const dynamic = 'force-dynamic';

export default async function TudicoPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-auth-tenant-id');

  if (!tenantId) {
    return <div className="p-6">Tenant não encontrado para Tudico.</div>;
  }

  const state = await getTudicoMemoryState(tenantId);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-slate-900">Tudico (MVP isolado)</h1>
        <p className="mt-2 text-sm text-slate-600">
          Hub de pesquisa para Estrutura Quântica-Relacional. Escopo isolado de Frank e CONDSTORE operacional.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Visão geral da frente</h2>
          <p className="mt-2 text-sm text-slate-700">{state.masterDocument.summary}</p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Estado MVP em Rindler</h2>
          <p className="mt-2 text-sm text-slate-700">
            Hipótese atual: v{state.hypothesisVersions[state.hypothesisVersions.length - 1]?.version ?? 'n/a'}.
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium text-slate-900">Claims</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {state.claims.map((claim) => (
              <li key={claim.id} className="rounded border border-slate-100 p-2">
                <strong>{claim.id}</strong>: {claim.statement} <em>({claim.status})</em>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium text-slate-900">Glossary</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {state.glossary.map((term) => (
              <li key={term.term} className="rounded border border-slate-100 p-2">
                <strong>{term.term}</strong>: {term.definition}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium text-slate-900">Inconsistências</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {state.inconsistencies.map((item) => (
              <li key={item.id} className="rounded border border-slate-100 p-2">
                <strong>{item.id}</strong>: {item.description}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium text-slate-900">Perguntas em aberto</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {state.openQuestions.map((item) => (
              <li key={item.id} className="rounded border border-slate-100 p-2">
                <strong>{item.priority}</strong>: {item.question}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-medium text-slate-900">Versões da hipótese</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {state.hypothesisVersions.map((version) => (
            <li key={version.id} className="rounded border border-slate-100 p-2">
              v{version.version} — {version.summary}
            </li>
          ))}
        </ul>
      </section>

      <TudicoQueryPanel />
    </main>
  );
}
