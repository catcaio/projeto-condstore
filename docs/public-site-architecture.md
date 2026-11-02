# Arquitetura do Site Público — CONDSTORE OS

> **Status**: Consolidado Canônico · **Vínculo**: Issue Âncora #419 / ClickUp P1 · **Decisão**: CONDSTORE OS é um ecossistema único (Sistema Operacional Supervisionado para Distribuidoras B2B), não uma vitrine de produtos e módulos desconectados.

---

## 1. Inventário Canônico das Páginas Públicas Atuais

### Grupo `(public)` — Páginas Canônicas Ativas

| Rota | Arquivo | Papel Operacional / Arquitetural |
|------|---------|----------------------------------|
| `/` | `src/app/(public)/page.tsx` | Home principal enxuta (Hero interativo, quebra de contexto, fluxo unificado, 5 momentos, governança e CTA final). Possui `data-testid="public-hero-title"` e `data-testid="public-primary-cta"`. |
| `/produto` | `src/app/(public)/produto/page.tsx` | Apresentação integrada da plataforma (Rótulo público: "Ecossistema"). Conecta Atendimento, Frete, Pedidos, Logística e Cockpit em um único ciclo. |
| `/como-funciona` | `src/app/(public)/como-funciona/page.tsx` | Fluxo operacional contínuo supervisionado passo a passo, do WhatsApp ao caminhão. |
| `/ia-frank` | `src/app/(public)/ia-frank/page.tsx` | Copiloto supervisionado Frank IA (limites operacionais, tool-guards e governança). |
| `/seguranca` | `src/app/(public)/seguranca/page.tsx` | Segurança, LGPD, isolamento estrito por tenant e trilha de auditoria. |
| `/piloto` | `src/app/(public)/piloto/page.tsx` | Avaliação Operacional Assistida (CTA de conversão primário). |
| `/contato` | `src/app/(public)/contato/page.tsx` | Agendamento e qualificação comercial guiada pelo contexto real. |
| `/faq` | `src/app/(public)/faq/page.tsx` | Perguntas frequentes operacionais e contratuais. |
| `/docs` | `src/app/(public)/docs/page.tsx` | Documentação pública e guias operacionais (contém `data-testid="public-docs-content"`). |
| `/planos/envios` | `src/app/(public)/planos/envios/page.tsx` | Planos de infraestrutura logística (testado em QA via `pricing-hero`, `pricing-plans`). |
| `/planos/crm` | `src/app/(public)/planos/crm/page.tsx` | Planos de atendimento e automação. |
| `/planos/domine` | `src/app/(public)/planos/domine/page.tsx` | Planos DOMINE (Frozen). |
| `/privacidade` | `src/app/(public)/privacidade/page.tsx` | Política de Privacidade (obrigatório LGPD). |
| `/termos` | `src/app/(public)/termos/page.tsx` | Termos de Uso contratuais. |
| `/app` | `src/app/(public)/app/page.tsx` | App de acesso operacional distribuído por perfil. |
| `/brand-preview` | `src/app/(public)/brand-preview/page.tsx` | Painel de visualização da identidade institucional. |
| `/sitemap` | `src/app/(public)/sitemap/page.tsx` | Explorador arquitetural interativo. |

---

## 2. Matriz de Consolidação e Redirecionamentos (Antes → Depois)

Todas as rotas legadas redundantes foram removidas do código-fonte e redirecionadas permanentemente (HTTP 301 direto, sem chaining ou loops) em `next.config.mjs`:

| Rota Original (Legada) | Ação Executada | Destino Canônico | Justificativa Arquitetural |
|------------------------|----------------|------------------|----------------------------|
| `/crm-whatsapp` | Removida + Redirect 301 | `/produto` | O CONDSTORE OS não é um CRM isolado; integra o atendimento ao ciclo completo da plataforma. |
| `/logistica-pedidos` | Removida + Redirect 301 | `/produto` | Frete e pedidos não são produtos avulsos; compõem o ecossistema integrado. |
| `/cockpit-gerencial` | Removida + Redirect 301 | `/produto` | Visibilidade e controle gerencial unificados no ecossistema. |
| `/plataforma` | Removida + Redirect 301 | `/produto` | Rota redundante com `/produto` ("Ecossistema"). |
| `/tecnologias` | Removida + Redirect 301 | `/produto` | Stack tecnológico incorporado na narrativa do ecossistema. |
| `/solucoes` | Removida + Redirect 301 | `/produto` | Soluções por vertical consolidadas na visão unificada. |
| `/implantacao` | Removida + Redirect 301 | `/como-funciona` | Processo operacional e ativação integrados na jornada "Como Funciona". |
| `/integracoes` | Removida + Redirect 301 | `/produto` | Visão de ecossistema integrado nativamente. |
| `/showcase` | Removida + Redirect 301 | `/produto` | Telas e capacidades integradas na narrativa central. |
| `/valores` | Removida + Redirect 301 | `/produto` | Princípios de eficiência operacional presentes no ecossistema. |
| `/gargalos-logisticos` | Removida + Redirect 301 | `/como-funciona` | Diagnóstico de gargalos resolvido pelo fluxo ponta a ponta. |
| `/proof` | Removida + Redirect 301 | `/como-funciona` | Prova operacional e casos reais consolidados no fluxo. |
| `/produtos/crm` | Alias histórico atualizado | `/produto` | Evita chaining para a antiga `/crm-whatsapp`. |
| `/produtos/envios` | Alias histórico atualizado | `/produto` | Evita chaining para a antiga `/logistica-pedidos`. |
| `/plataforma/cockpit` | Alias histórico atualizado | `/produto` | Evita chaining para a antiga `/cockpit-gerencial`. |

---

## 3. Navegação Canônica (Header & Footer)

### Menu Principal (Header — 4 Entradas Core)
1. **Ecossistema** (`/produto`)
2. **Como Funciona** (`/como-funciona`)
3. **Frank IA** (`/ia-frank`)
4. **Segurança** (`/seguranca`)

Ações:
- **Entrar** (`/login`)
- **Avaliação Operacional** (`/piloto`)
- Alternador de tema Light/Dark

### Rodapé (Footer — Estrutura Unificada)
- **Ecossistema**: Ecossistema CONDSTORE OS (`/produto`), Como Funciona (`/como-funciona`), IA Frank Supervisionada (`/ia-frank`), Piloto Operacional (`/piloto`), FAQ (`/faq`).
- **Empresa & Acesso**: Contato (`/contato`), Documentação (`/docs`), Planos e Preços (`/planos/envios`), Entrar no Sistema (`/login`).
- **Legal & Conformidade**: Segurança (`/seguranca`), Privacidade (`/privacidade`), Termos (`/termos`).

---

## 4. Estrutura da Home Enxuta

A Home (`/`) foi simplificada de 14 para 5-6 momentos narrativos essenciais:
1. **Hero & Reconhecimento**: `InteractiveHero` (com `data-testid="public-hero-title"` e `data-testid="public-primary-cta"`).
2. **A Dor da Fragmentação**: `ContextBreakdownSection` (O Fio da Operação rompido entre conversas, cotações e despachos).
3. **O Fluxo Unificado**: `ContinuousFlowTransformation` (Da conversa ao caminhão sem ruído).
4. **Maturidade e Realidade Operacional**: `FiveMomentsSection` + `BrazilOperationalRealismSection`.
5. **Governança & Trilha de Auditoria**: Bloco de auditoria, isolamento multi-tenant e supervisão humana + `FaqSection`.
6. **Ação Operacional**: CTA de conversão direto para `/piloto` e `/contato`.

---

## 5. Proteções & Guardrails Verificados
- **Zero Impacto no Cockpit**: Módulos autenticados (`/cockpit`, APIs, Drizzle, Auth) intocados.
- **QA Snapshots**: Testids críticos preservados intactos (`public-hero-title`, `public-primary-cta`, `public-docs-content`, `pricing-hero`, etc.).
- **Tenant Isolation**: Gate verificado contra hardcodes e vazamentos.
- **Sitemap & SEO**: Rotas sincronizadas via `npm run routes:sync` e sitemap XML atualizado.
