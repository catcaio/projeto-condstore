'use client';

import { useEffect, useMemo, useState } from 'react';

type HypothesisVersion = {
  id: string;
  version: number;
  title: string;
  summary: string;
  claims: Array<{ id: string; text: string; level: 'evidence' | 'inference' | 'speculation'; referenceIds: string[] }>;
};

type PaperCard = { id: string; title: string; year: number; claimIds: string[]; sourceUrl: string; summary: string };
type Inconsistency = { id: string; title: string; claimId: string; paperId: string; severity: string; status: string };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Falha ao carregar dados Tudico');
  const payload = await res.json();
  return payload.data as T;
}

export default function TudicoPageClient() {
  const [versions, setVersions] = useState<HypothesisVersion[]>([]);
  const [papers, setPapers] = useState<PaperCard[]>([]);
  const [inconsistencies, setInconsistencies] = useState<Inconsistency[]>([]);
  const [diff, setDiff] = useState<Record<string, unknown> | null>(null);
  const [audit, setAudit] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [hypothesis, paperCards, board] = await Promise.all([
          getJson<HypothesisVersion[]>('/api/cockpit/tudico/hypotheses'),
          getJson<PaperCard[]>('/api/cockpit/tudico/papers'),
          getJson<Inconsistency[]>('/api/cockpit/tudico/inconsistencies'),
        ]);
        setVersions(hypothesis);
        setPapers(paperCards);
        setInconsistencies(board);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha desconhecida');
      }
    })();
  }, []);

  const latestClaimIds = useMemo(() => versions.at(-1)?.claims.map((claim) => claim.id) ?? [], [versions]);

  async function compareLatest() {
    if (versions.length < 2) return;
    const from = versions[versions.length - 2];
    const to = versions[versions.length - 1];
    const data = await getJson<Record<string, unknown>>(
      `/api/cockpit/tudico/hypotheses/compare?fromId=${from.id}&toId=${to.id}`,
    );
    setDiff(data);
  }

  async function auditSample() {
    const res = await fetch('/api/cockpit/tudico/audit-response', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        responseText:
          'Essa hipótese está definitivamente confirmada e sem dúvida prova o mecanismo, usando analogia como mecanismo.',
        claimIds: latestClaimIds,
      }),
    });

    if (!res.ok) {
      setError('Não foi possível auditar resposta');
      return;
    }

    const payload = await res.json();
    setAudit(payload.data);
  }

  if (error) {
    return <div className="p-6 text-red-500">Erro Tudico: {error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Tudico Fase 2</h1>
        <p className="text-sm opacity-70">Versionamento de hipóteses, paper cards, inconsistências e auditoria epistemológica.</p>
      </header>

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-medium">Versões da hipótese</h2>
        {versions.length === 0 && <p className="text-sm opacity-70">Nenhuma versão registrada ainda.</p>}
        {versions.map((version) => (
          <article key={version.id} className="text-sm border rounded p-3">
            <div className="font-medium">v{version.version} — {version.title}</div>
            <p className="opacity-80">{version.summary}</p>
            <p className="opacity-70">Claims: {version.claims.length}</p>
          </article>
        ))}
        <button className="px-3 py-2 border rounded" onClick={compareLatest} disabled={versions.length < 2}>Comparar últimas versões</button>
        {diff && <pre className="text-xs bg-black/5 p-3 rounded overflow-auto">{JSON.stringify(diff, null, 2)}</pre>}
      </section>

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-medium">Paper cards</h2>
        {papers.map((paper) => (
          <article key={paper.id} className="text-sm border rounded p-3 space-y-1">
            <div className="font-medium">{paper.title} ({paper.year})</div>
            <p className="opacity-80">{paper.summary}</p>
            <a className="underline" href={paper.sourceUrl} target="_blank" rel="noreferrer">Abrir referência</a>
          </article>
        ))}
      </section>

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-medium">Inconsistency board</h2>
        {inconsistencies.length === 0 && <p className="text-sm opacity-70">Nenhuma inconsistência aberta.</p>}
        {inconsistencies.map((item) => (
          <article key={item.id} className="text-sm border rounded p-3">
            <div className="font-medium">{item.title}</div>
            <p>Status: {item.status} · Severidade: {item.severity}</p>
            <p>Claim: {item.claimId} · Paper: {item.paperId}</p>
          </article>
        ))}
      </section>

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-medium">Auditoria epistemológica</h2>
        <button className="px-3 py-2 border rounded" onClick={auditSample}>Executar audit_response</button>
        {audit && <pre className="text-xs bg-black/5 p-3 rounded overflow-auto">{JSON.stringify(audit, null, 2)}</pre>}
      </section>
    </div>
  );
}
