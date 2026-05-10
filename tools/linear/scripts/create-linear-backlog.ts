import { LinearClient } from '../linear-client';

const TEAM_ID = '09c2698b-e53f-4f3e-b809-5f8ad7ba692b';
const BACKLOG_STATE_ID = '3725fb65-adc5-409d-8ddc-803e00424401';
const IN_REVIEW_STATE_ID = '0c03a258-006a-43bf-9a82-2635efade2f1';

const ISSUES = [
  { 
    title: 'PR1 — Frontend public audit + sitemap registry',
    description: 'Auditar o frontend público atual e criar a base canônica.\n\nPR: https://github.com/catcaio/projeto-condstore/pull/297\nClickUp: https://app.clickup.com/t/86e18kxxm',
    stateId: IN_REVIEW_STATE_ID
  },
  { title: 'PR2 — Home canônica', description: 'Implementar Home canônica (layout e copy base).\nClickUp: https://app.clickup.com/t/86e18kxxm' },
  { title: 'PR3 — Produto + Como Funciona', description: 'Implementar Produto + Como Funciona (copy técnica simplificada).' },
  { title: 'PR4 — Atendimento WhatsApp + CRM Operacional', description: 'Refinar páginas de CRM/WhatsApp.' },
  { title: 'PR5 — Logística + Cotação + Pedidos', description: 'Refinar Logística, Cotações e Pedidos.' },
  { title: 'PR6 — Cockpit + Métricas/ROI', description: 'Detalhar Cockpit e métricas/ROI.' },
  { title: 'PR7 — IA Frank Supervisionada', description: 'Landing page IA Frank (Foco supervisionado).' },
  { title: 'PR8 — Segurança/LGPD + FAQ', description: 'Segurança, LGPD, Privacidade e Termos.' },
  { title: 'PR9 — Demo/Piloto + CTA tracking', description: 'Página de Piloto / Demo com tracking atualizado.' },
  { title: 'PR10 — QA visual, copy pass, cleanup e documentação', description: 'QA Visual e Cleanup final.' }
];

async function main() {
  const client = new LinearClient();
  console.log('Creating Linear Backlog...');

  for (const issue of ISSUES) {
    try {
      const result = await client.createIssue(TEAM_ID, {
        title: issue.title,
        description: issue.description,
        stateId: issue.stateId || BACKLOG_STATE_ID
      });
      if (result.issueCreate.success) {
        console.log(`- Created: ${result.issueCreate.issue.identifier} (${issue.title})`);
      }
    } catch (e: any) {
      console.error(`- Failed: ${issue.title}`, e.message);
    }
  }
}

main();
