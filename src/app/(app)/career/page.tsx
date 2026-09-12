'use client';

import React, { useState } from 'react';

const careerData = {
  "metadata": {
    "version": "2.0.0",
    "updated_at": "2026-09-11",
    "owner": "Rafael Barros",
    "source_of_truth": "data.json"
  },
  "kpis": {
    "total_applications": 3,
    "ready_to_apply": 1,
    "analyzing": 1,
    "withdrawn": 1,
    "interviews": 0,
    "offers": 0
  },
  "applications": [
    {
      "id": "app-causa-certa-2026",
      "company": "CAUSA CERTA LTDA",
      "role": "Analista Administrativo de Vendas",
      "url": "https://vagas.solides.com.br/vaga/915050",
      "discovery_date": "2026-09-10",
      "status": "READY_TO_APPLY",
      "fit_score": 85,
      "location": "São José/SC",
      "modality": "Remoto (CLT)",
      "salary": "R$ 2.627 CLT",
      "senioridade": "Pleno / Júnior",
      "next_action": "Aplicar com currículo v2 gerado (.pdf e .docx)",
      "requirements": [
        "Organização e comunicação",
        "Rotinas administrativas",
        "Planilhas e sistemas",
        "Experiência admin/comercial/atendimento"
      ],
      "gaps": [
        "Sem vivência no setor jurídico (não exigido)"
      ],
      "documents": [
        "resumes/generated/Rafa_Nascimento_Curriculo_CausaCerta_AnalistaAdmVendas_V2.docx",
        "resumes/generated/Rafa_Nascimento_Curriculo_CausaCerta_AnalistaAdmVendas_V2.pdf",
        "resumes/generated/spec-admvendas-causacerta-v2.json"
      ],
      "notes": "Requisitos atendidos. Pronto para envio imediato."
    },
    {
      "id": "app-vhl-sistemas-2026",
      "company": "VHL Sistemas (Valsoft Corp)",
      "role": "Sales Consultant (Consultor de Vendas Pleno)",
      "url": "https://apply.workable.com/valsoft-corp/j/B34C309BA4",
      "discovery_date": "2026-09-09",
      "status": "ANALYZING",
      "fit_score": 78,
      "location": "Home Office / Viagens",
      "modality": "Home Office (viagens)",
      "salary": "Salário fixo + comissão e bonificação trimestral",
      "senioridade": "Pleno",
      "next_action": "Aguardar base + currículo de vendas B2B",
      "requirements": [
        "Prospecção ativa B2B",
        "Disponibilidade para viagens",
        "CNH B",
        "Uso de CRM",
        "Formação em andamento (Adm 3 anos + ADS)"
      ],
      "gaps": [
        "Venda de software/SaaS como produto (parcial)",
        "Experiência com rotinas de cartório (diferencial)"
      ],
      "documents": [
        "EXPERIENCE.md",
        "SKILLS.md"
      ],
      "notes": "Aguardando estruturação do currículo B2B específico."
    },
    {
      "id": "app-franquias-2026",
      "company": "Rede de franquias em expansão (Tatiani Rodrigues RH)",
      "role": "Customer Success (franqueados)",
      "url": "https://vagas.solides.com.br/vaga/913010",
      "discovery_date": "2026-09-10",
      "status": "WITHDRAWN",
      "fit_score": 70,
      "location": "Campeche, Florianópolis/SC",
      "modality": "Presencial (PJ)",
      "salary": "R$ 4.500 PJ",
      "senioridade": "Pleno",
      "next_action": "Branding e estratégia com Rafael antes de retomar",
      "requirements": [
        "B2B",
        "Indicadores e processos",
        "Comunicação"
      ],
      "gaps": [
        "Sem experiência prévia em franquias",
        "Sem título formal de CS",
        "Deslocamento Nova Palhoça ➔ Campeche",
        "Formação incompleta"
      ],
      "documents": [
        "PROFILE.md"
      ],
      "notes": "Retirado temporariamente para alinhamento estratégico."
    }
  ],
  "documents_index": [
    {
      "name": "PROFILE.md",
      "category": "Master",
      "description": "Perfil profissional e dados centrais de Rafael Barros"
    },
    {
      "name": "EXPERIENCE.md",
      "category": "Master",
      "description": "Histórico profissional detalhado (LojaCond, Flex, etc.)"
    },
    {
      "name": "SKILLS.md",
      "category": "Master",
      "description": "Matriz de competências técnicas e comportamentais"
    },
    {
      "name": "RULES.md",
      "category": "Governance",
      "description": "Regras de integridade, fatos vs hipóteses e sincronização"
    },
    {
      "name": "applications/tracker.md",
      "category": "Tracking",
      "description": "Tracker markdown tradicional de candidaturas"
    },
    {
      "name": "resumes/generated/Rafa_Nascimento_Curriculo_CausaCerta_AnalistaAdmVendas_V2.docx",
      "category": "Resumes",
      "description": "Currículo ATS otimizado para Causa Certa (Word)"
    },
    {
      "name": "resumes/generated/Rafa_Nascimento_Curriculo_CausaCerta_AnalistaAdmVendas_V2.pdf",
      "category": "Resumes",
      "description": "Currículo ATS otimizado para Causa Certa (PDF)"
    },
    {
      "name": "linkedin/DIAGNOSTICO-2026-09-10.md",
      "category": "Audit",
      "description": "Diagnóstico e baseline do perfil LinkedIn"
    },
    {
      "name": "research/relatorio-estrategia-2026.md",
      "category": "Research",
      "description": "Relatório de estratégia de carreira e posicionamento"
    }
  ]
};

export default function CareerDashboardPage() {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const kpis = careerData.kpis;

  const filteredApps = careerData.applications.filter(app => {
    const matchesStatus = (filter === 'ALL' || app.status === filter);
    const matchesSearch = app.company.toLowerCase().includes(search.toLowerCase()) ||
                          app.role.toLowerCase().includes(search.toLowerCase()) ||
                          app.requirements.some(r => r.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'READY_TO_APPLY':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">READY_TO_APPLY</span>;
      case 'ANALYZING':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">ANALYZING</span>;
      case 'WITHDRAWN':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">WITHDRAWN</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-gray-800 text-gray-300 rounded-full border border-gray-700">{status}</span>;
    }
  };

  const docCategories: Record<string, any[]> = {};
  careerData.documents_index.forEach(doc => {
    if (!docCategories[doc.category]) docCategories[doc.category] = [];
    docCategories[doc.category].push(doc);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-4 sm:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            RB
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Career & Applications Hub</h1>
            <p className="text-xs text-slate-400">Protegido por CondStore Auth • Sincronizado com catcaio/career</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Autenticado & Protegido
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Candidaturas</span>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{kpis.total_applications}</span>
            <span className="text-xs text-emerald-400 font-medium">Ativo</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pronto para Aplicar</span>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{kpis.ready_to_apply}</span>
            <span className="text-xs text-emerald-400 font-medium">Causa Certa</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Em Análise</span>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{kpis.analyzing}</span>
            <span className="text-xs text-amber-400 font-medium">VHL Sistemas</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Documentos Base</span>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{careerData.documents_index.length}+</span>
            <span className="text-xs text-blue-400 font-medium">Versionados</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-96 relative">
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por empresa, cargo ou requisito..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button onClick={() => setFilter('ALL')} className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${filter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Todas</button>
          <button onClick={() => setFilter('READY_TO_APPLY')} className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${filter === 'READY_TO_APPLY' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Prontas</button>
          <button onClick={() => setFilter('ANALYZING')} className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${filter === 'ANALYZING' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Em Análise</button>
          <button onClick={() => setFilter('WITHDRAWN')} className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${filter === 'WITHDRAWN' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Retiradas</button>
        </div>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Acompanhamento de Candidaturas</h2>
            <p className="text-xs text-slate-400">Clique em qualquer linha para inspecionar detalhes e documentos.</p>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">Total: {filteredApps.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Empresa / Cargo</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Fit / Local</th>
                <th className="py-3.5 px-6">Remuneração</th>
                <th className="py-3.5 px-6">Próxima Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {filteredApps.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">Nenhuma candidatura encontrada.</td></tr>
              ) : (
                filteredApps.map(app => (
                  <tr key={app.id} onClick={() => setSelectedApp(app)} className="hover:bg-slate-800/40 transition cursor-pointer">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white">{app.company}</div>
                      <div className="text-xs text-indigo-400">{app.role}</div>
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(app.status)}</td>
                    <td className="py-4 px-6">
                      <div className="text-xs font-medium text-emerald-300">{app.fit_score}% Fit</div>
                      <div className="text-xs text-slate-400">{app.location}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs font-medium text-gray-200">{app.salary}</div>
                      <div className="text-xs text-slate-500">{app.modality}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs text-gray-300 font-medium">{app.next_action}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">Base de Conhecimento e Documentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(docCategories).map(([cat, docs]) => (
            <div key={cat} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-white text-sm">Categoria: {cat}</h3>
              <ul className="space-y-1 text-xs text-slate-300 pt-2 border-t border-slate-800">
                {docs.map(d => (
                  <li key={d.name} className="flex items-center justify-between py-1">
                    <span className="truncate max-w-[200px]" title={d.name}>{d.name}</span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{d.category}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {selectedApp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 relative shadow-2xl">
            <button onClick={() => setSelectedApp(null)} className="absolute right-4 top-4 text-slate-400 hover:text-white p-2">✕</button>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-400 font-semibold uppercase">{selectedApp.company}</span>
                {getStatusBadge(selectedApp.status)}
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{selectedApp.role}</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400">Fit</span>
                <div className="text-base font-bold text-emerald-400">{selectedApp.fit_score}%</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400">Local</span>
                <div className="text-xs font-semibold text-gray-200 mt-1">{selectedApp.location}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400">Salário</span>
                <div className="text-xs font-semibold text-gray-200 mt-1">{selectedApp.salary}</div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Próxima Ação</h3>
              <p className="text-xs text-gray-200 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl">{selectedApp.next_action}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Requisitos</h3>
                <ul className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedApp.requirements.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300">✓ {r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Gaps</h3>
                <ul className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedApp.gaps.map((g: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300">⚠ {g}</li>
                  ))}
                </ul>
              </div>
            </div>
            {selectedApp.url && (
              <div>
                <a href={selectedApp.url} target="_blank" rel="noreferrer" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition">
                  Abrir Link Original da Vaga ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
