# Arquitetura do Site Público — CONDSTORE OS

> **Status**: Consolidado Canônico · **Vínculo**: Issue Âncora #419 / ClickUp P1 (CU-86e1apjge) · **Decisão**: CONDSTORE OS é um ecossistema único (Sistema Operacional Supervisionado para Distribuidoras B2B), não uma vitrine de produtos e módulos desconectados.

---

## 1. Inventário Canônico das Páginas Públicas Atuais

### Grupo `(public)` — Páginas Canônicas Ativas

| Rota | Arquivo | Papel Operacional / Arquitetural |
|------|---------|----------------------------------|
| `/` | `src/app/(public)/page.tsx` | Home principal enxuta (Hero interativo, fluxo unificado sem ruído, 5 momentos operacionais, governança/auditoria real, FAQ essencial e CTA final). Possui `data-testid="public-hero-title"` e `data-testid="public-primary-cta"`. |
| `/produto` | `src/app/(public)/produto/page.tsx` | Apresentação integrada da plataforma (Rótulo público: "Ecossistema"). Conecta Atendimento, Frete, Pedidos, Logística e Cockpit em um único ciclo. |
| `/como-funciona` | `src/app/(public)/como-funciona/page.tsx` | Fluxo operacional contínuo supervisionado passo a passo, do WhatsApp ao caminhão. |
| `/ia-frank` | `src/app/(public)/ia-frank/page.tsx` | Copiloto supervisionado Frank IA (limites operacionais, tool-guards e governança). |
| `/seguranca` | `src/app/(public)/seguranca/page.tsx` | Segurança, LGPD, isolamento estrito por tenant e trilha de auditoria. |
| `/piloto` | `src/app/(public)/piloto/page.tsx` | Avaliação Operacional Assistida (CTA de conversão primário). |
| `/contato` | `src/app/(public)/contato/page.tsx` | Agendamento e qualificação comercial guiada pelo contexto real. |
| `/faq` | `src/app/(public)/faq/page.tsx` | Perguntas frequentes operacionais e contratuais completas. |
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

Todas as rotas legadas redundantes foram removidas do código-fonte e redirecionadas permanentemente (HTTP 308 direto, sem chaining ou loops) em `next.config.mjs`:

| Rota Original (Legada) | Ação Executada | Destino Canônico | Conteúdo Essencial Realocado / Justificativa |
|------------------------|----------------|------------------|-----------------------------------------------|
| `/crm-whatsapp` | Removida + Redirect 308 | `/produto` | Narrativa de atendimento e centralização de WhatsApp integrada na Seção "Módulos" de `/produto` e no fluxo de `/como-funciona`. |
| `/logistica-pedidos` | Removida + Redirect 308 | `/produto` | Cotação multicarrier e formalização de pedidos integradas como fases nativas em `/produto` e `/como-funciona`. |
| `/cockpit-gerencial` | Removida + Redirect 308 | `/produto` | Painel de controle e visibilidade operacional integrados no ecossistema de `/produto`. |
| `/plataforma` | Removida + Redirect 308 | `/produto` | Redundância estrutural com `/produto` ("Ecossistema"). |
| `/tecnologias` | Removida + Redirect 308 | `/produto` | Stack e capacidades técnicas resumidas na seção "Diferenciais" de `/produto`. |
| `/solucoes` | Removida + Redirect 308 | `/produto` | Soluções por perfil/vertical integradas na visão de ecossistema único. |
| `/implantacao` | Removida + Redirect 308 | `/como-funciona` | Treinamento, acompanhamento e ativação assistida consolidados na jornada de `/como-funciona` e na qualificação do `/piloto`. |
| `/integracoes` | Removida + Redirect 308 | `/produto` | Conexões com ERPs/APIs de transportadoras mantidas na Seção de Conectividade do Ecossistema em `/produto`. |
| `/showcase` | Removida + Redirect 308 | `/produto` | Telas estáticas descartadas; demonstração interativa mantida no Hero da Home e nos fluxos de `/como-funciona`. |
| `/valores` | Removida + Redirect 308 | `/produto` | Página puramente comercial de tiers e contratação personalizada; planos padronizados referenciados em `/planos/envios` e onboarding customizado em `/contato` e `/piloto`. |
| `/gargalos-logisticos` | Removida + Redirect 308 | `/como-funciona` | Diagnóstico de gargalos e perdas logísticas tratado como problema-raiz no fluxo contínuo de `/como-funciona`. |
| `/proof` | Removida + Redirect 308 | `/como-funciona` | Prova operacional e rastreabilidade viva integradas nos blocos de auditoria e governança de `/como-funciona`. |
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

## 4. Estrutura da Home Enxuta & Acessibilidade

A Home (`/`) foi simplificada de 14 seções para 5-6 momentos operacionais contínuos:
1. **Hero & Demonstração**: `InteractiveHero` (preserva os testids `public-hero-title` e `public-primary-cta`).
2. **O Fluxo Unificado**: `ContinuousFlowTransformation` (Da conversa ao caminhão sem ruído).
3. **Maturidade e Realidade Operacional**: `FiveMomentsSection`.
4. **Governança & Auditoria Real**: Bloco compacto de rastreabilidade, isolamento por tenant e supervisão humana.
5. **FAQ Selecionado**: 4 perguntas de decisão com accordion acessível (`aria-expanded`, `aria-controls`, IDs estáveis, Enter/Space e `hidden` no DOM quando fechado), com link direto para todas as perguntas em `/faq`.
6. **Ação Operacional**: CTA de conversão direto para `/piloto` e `/contato`.

---

## 5. Proteções, Invariantes e Canonicals
- **Zero Impacto no Cockpit**: Módulos autenticados (`/cockpit`, APIs, Drizzle, Auth) intocados.
- **Frank Protegido**: `src/modules/frank/frank-system-knowledge.ts` estritamente idêntico à base `origin/main`.
- **Tema Público**: Claro como padrão natural em SSR e primeira pintura (inclusive com OS escuro). Modo escuro ativado apenas por escolha explícita em `condstore-site-theme`. Zero flash na carga inicial.
- **Canonicals**: Cada página canônica pública possui `alternates.canonical` apontando para o seu próprio caminho relativo canônico (`/`, `/produto`, `/como-funciona`, etc.).
- **Sitemap**: `/pricing` substituído pelo destino canônico `/planos/envios`.
