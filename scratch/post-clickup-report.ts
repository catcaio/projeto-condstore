import { ClickUpClient } from '../tools/clickup/clickup-client';

const report = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ORCHESTRATOR SNAPSHOT — 2026-05-07T19:50
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 PARA ENCONTRAR: busque "ORCHESTRATOR SNAPSHOT" nos comentários desta task.

━━ ESTADO GERAL ━━━━━━━━━━━━━━━━━━━━━━━━
STATUS: AHEAD OF SCHEDULE
PRs 1–4 MERGEADAS. Bloco PR8 desbloqueado.

━━ GITHUB — FONTE DA VERDADE ━━━━━━━━━━━
PR #297 → MPV-71 (PR1 Audit+Sitemap)     : MERGED e788e48
PR #298 → MPV-72 (PR2 Home Canônica)     : MERGED 35aabb6
PR #300 → MPV-73 (PR3 Produto+Como Func) : MERGED 1dbb0ba
PR #303 → MPV-74/75/76/77 (PR4 Block)    : MERGED fb0b52c
PR #301 → code health logistics           : MERGED cdbc4ff
HEAD main: cdbc4ff

━━ ROTAS CANÔNICAS ATIVAS (PR4) ━━━━━━━━
/crm-whatsapp
/logistica-pedidos
/cockpit-gerencial
/ia-frank
/produto

━━ LINEAR — FILA TÉCNICA ━━━━━━━━━━━━━━━
MPV-71 ✅ Done  (PR1)
MPV-72 ✅ Done  (PR2)
MPV-73 ✅ Done  (PR3)
MPV-74 ✅ Done  (PR4 Block)
MPV-75 ✅ Done  (PR4 Block)
MPV-76 ✅ Done  (PR4 Block)
MPV-77 ✅ Done  (PR4 Block)
MPV-78 🟡 Backlog → PRÓXIMO (PR8 Seg/LGPD)
MPV-79 🟡 Backlog  (PR9 Demo/Piloto)
MPV-80 🟡 Backlog  (PR10 QA Visual)

━━ GUARDRAILS ━━━━━━━━━━━━━━━━━━━━━━━━━
guardrail:mvp-freeze : OK ✅
typecheck            : OK ✅ (exit 0)

━━ PRÓXIMO PASSO ━━━━━━━━━━━━━━━━━━━━━━
Bloco: MPV-78 / PR8 — Segurança/LGPD/FAQ
Executor: Jules
Prompt pronto: revisar /seguranca /privacidade /termos
Dependência: PR4 mergeada ✅ DESBLOQUEADO

━━ LINKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GitHub main: https://github.com/catcaio/projeto-condstore/tree/main
Linear MPV-78: https://linear.app/condstoreos/issue/MPV-78
ClickUp (esta task): https://app.clickup.com/t/86e18kxxm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

async function main() {
  const c = new ClickUpClient();
  const res = await c.createTaskComment('86e18kxxm', report);
  if (res) {
    console.log('[CLICKUP] Snapshot posted, comment ID:', res.id);
  } else {
    console.log('[CLICKUP] Skipped (DRY_RUN)');
  }
}

main().catch(console.error);
