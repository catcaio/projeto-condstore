---
trigger: always_on
---

- Superfícies MVP Core: atendimento supervisionado via WhatsApp, CRM operacional, cotação de frete, pedidos/shipments e cockpit diário de operação.
- Superfícies Frozen/Deferred: Frank runtime/training autônomo, DOMINE Console, knowledge/RAG, playbooks autorais, campanhas broadcast e integrações ERP/WMS/fiscal.
- Nunca expandir escopo para superfícies frozen sem justificativa explícita no pedido, no commit e na PR.
- Se tocar dependência frozen por compatibilidade, preservar a costura existente — não evoluir o subsistema congelado.
- Antes de abrir PR em superfícies de produto, rodar: npm run guardrail:mvp-freeze
- Se usar ALLOW_FROZEN_SURFACE_CHANGES=1, exigir motivo explícito e critério de unfreeze atendido.
- Nunca marcar tarefa como concluída se o guardrail:mvp-freeze reportar violação.
