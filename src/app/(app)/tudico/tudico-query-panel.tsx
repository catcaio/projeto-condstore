'use client';

import { useState } from 'react';

import type { TudicoToolName, TudicoResponse } from '@/modules/tudico';

const TOOL_OPTIONS: TudicoToolName[] = [
  'get_claim_status',
  'compare_hypothesis_versions',
  'fetch_glossary_term',
  'list_open_questions',
  'audit_response_for_extrapolation',
  'map_concept_dependencies',
  'summarize_regime_state',
];

export function TudicoQueryPanel() {
  const [query, setQuery] = useState('Qual é o estado atual da hipótese?');
  const [tool, setTool] = useState<TudicoToolName>('summarize_regime_state');
  const [result, setResult] = useState<TudicoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tudico/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, tool }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || 'Falha ao consultar Tudico.');
      }

      const data = (await response.json()) as TudicoResponse;
      setResult(data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro inesperado.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-medium text-slate-900">Consulta epistemológica</h3>
      <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
        <label className="block text-sm text-slate-700">
          Consulta
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <label className="block text-sm text-slate-700">
          Tool
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={tool}
            onChange={(event) => setTool(event.target.value as TudicoToolName)}
          >
            {TOOL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Consultando...' : 'Executar consulta'}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {result ? (
        <div className="mt-4 space-y-3 rounded border border-slate-100 bg-slate-50 p-3 text-sm">
          <p><strong>Base estabelecida:</strong> {result.protocol.baseEstabelecida}</p>
          <p><strong>Leitura hipótese:</strong> {result.protocol.leituraHipoteseAtual}</p>
          <p><strong>Auditoria crítica:</strong> {result.protocol.auditoriaCritica}</p>
          <pre className="overflow-auto rounded bg-white p-2 text-xs">{JSON.stringify(result.toolResult, null, 2)}</pre>
        </div>
      ) : null}
    </section>
  );
}
