# Arquitetura do Site Público — CONDSTORE OS

> **Status**: Documental/Estratégico · **Branch**: `feature/86e1apjge-p1-site-publico` · **Aprovação**: Requerida antes de qualquer implementação visual ou de rotas

---

## 1. Inventário das Páginas Públicas Atuais

### Grupo `(public)` — ativo no main

| Rota | Arquivo | Observação |
|------|---------|-----------|
| `/` | `(public)/page.tsx` | Home principal, possui `data-testid="public-hero-title"` e `data-testid="public-primary-cta"` |
| `/produto` | `(public)/produto/page.tsx` | Visão geral das 4 fases do OS |
| `/como-funciona` | `(public)/como-funciona/page.tsx` | Fluxo supervisionado passo a passo |
| `/ia-frank` | `(public)/ia-frank/page.tsx` | Copiloto supervisionado Frank |
| `/seguranca` | `(public)/seguranca/page.tsx` | Infraestrutura, PII e isolamento por tenant |
| `/privacidade` | `(public)/privacidade/page.tsx` | Política de Privacidade |
| `/termos` | `(public)/termos/page.tsx` | Termos de Uso |
| `/crm-whatsapp` | `(public)/crm-whatsapp/page.tsx` | CRM e atendimento via WhatsApp |
| `/logistica-pedidos` | `(public)/logistica-pedidos/page.tsx` | Frete multicarrier e pedidos |
| `/cotacao` | `(public)/cotacao/page.tsx` | Formulário público de cotação |
| `/cockpit-gerencial` | `(public)/cockpit-gerencial/page.tsx` | Dashboards e indicadores |
| `/piloto` | `(public)/piloto/page.tsx` | CTA principal para avaliação |
| `/contato` | `(public)/contato/page.tsx` | Agendamento de demonstração |
| `/faq` | `(public)/faq/page.tsx` | Perguntas frequentes |
| `/proof` | `(public)/proof/page.tsx` | Prova operacional e casos de uso |
| `/plataforma` | `(public)/plataforma/page.tsx` | Visão técnica do sistema |
| `/tecnologias` | `(public)/tecnologias/page.tsx` | Stack tecnológico |
| `/valores` | `(public)/valores/page.tsx` | Valores e missão |
| `/solucoes` | `(public)/solucoes/page.tsx` | Soluções por vertical |
| `/gargalos-logisticos` | `(public)/gargalos-logisticos/page.tsx` | Diagnóstico de gargalos |
| `/implantacao` | `(public)/implantacao/page.tsx` | Processo de implantação |
| `/integracoes` | `(public)/integracoes/page.tsx` | Ecossistema de integrações |
| `/showcase` | `(public)/showcase/page.tsx` | Showcase de funcionalidades |
| `/planos/envios` | `(public)/planos/envios/page.tsx` | Planos de frete |
| `/planos/crm` | `(public)/planos/crm/page.tsx` | Planos de CRM |
| `/planos/domine` | `(public)/planos/domine/page.tsx` | Planos DOMINE (Frozen) |
| `/docs` | `(public)/docs/page.tsx` | Documentação pública |
| `/app` | `(public)/app/page.tsx` | App redirect |

### Grupo `(marketing)` — conceitual, existente no main

| Rota | Arquivo | Observação |
|------|---------|-----------|
| `/concept-layer` | `(marketing)/concept-layer/*` | Camada conceitual experimental (Frozen) |
| `/concept-layer-preview` | `(marketing)/concept-layer-preview/page.tsx` | Preview da camada conceitual (Frozen) |

---

## 2. Mapa das Rotas Públicas

### Estado atual (main branch)

```
/ (raiz)
├── (public)/                  ← grupo público (sem auth)
│   ├── page.tsx               → /
│   ├── layout.tsx             → layout compartilhado
│   ├── produto/               → /produto
│   ├── como-funciona/         → /como-funciona
│   ├── ia-frank/              → /ia-frank
│   ├── seguranca/             → /seguranca
│   ├── privacidade/           → /privacidade
│   ├── termos/                → /termos
│   ├── crm-whatsapp/          → /crm-whatsapp
│   ├── logistica-pedidos/     → /logistica-pedidos
│   ├── cotacao/               → /cotacao
│   ├── cockpit-gerencial/     → /cockpit-gerencial
│   ├── piloto/                → /piloto
│   ├── contato/               → /contato
│   ├── faq/                   → /faq
│   ├── proof/                 → /proof
│   ├── plataforma/            → /plataforma
│   ├── tecnologias/           → /tecnologias
│   ├── valores/               → /valores
│   ├── solucoes/              → /solucoes
│   ├── gargalos-logisticos/   → /gargalos-logisticos
│   ├── implantacao/           → /implantacao
│   ├── integracoes/           → /integracoes
│   ├── showcase/              → /showcase
│   ├── docs/                  → /docs
│   ├── planos/
│   │   ├── envios/            → /planos/envios
│   │   ├── crm/               → /planos/crm
│   │   └── domine/            → /planos/domine (Frozen)
│   └── area-estudo/           → área experimental
│
├── (marketing)/               ← grupo conceitual/experimental
│   ├── concept-layer/         → /concept-layer (Frozen)
│   └── concept-layer-preview/ → /concept-layer-preview (Frozen)
│
└── next.config.mjs            ← redirects: /plataforma, /tecnologias → /produto
```

### Redirects configurados (next.config.mjs)

| Origem | Destino | Tipo |
|--------|---------|------|
| `/crm-whatsapp` | `/produto` | Redirect (legado) |
| `/logistica-pedidos` | `/produto` | Redirect (legado) |
| `/plataforma` | `/produto` | Redirect (legado) |
| `/tecnologias` | `/produto` | Redirect (legado) |

---

## 3. Estratégia de Ciclo de Vida: Manter / Refatorar / Remover / Consolidar

### MVP Core — Manter e Polir

| Rota | Ação | Justificativa |
|------|------|---------------|
| `/` | **Manter** | Home com `data-testid` críticos para QA. Polir copy e visual. |
| `/produto` | **Manter** | Narrativa central do CONDSTORE OS. Já consolida CRM/Logística/Cockpit. |
| `/como-funciona` | **Manter** | Fluxo supervisionado é diferencial principal. |
| `/ia-frank` | **Manter** | Frank como copiloto é o coração do produto. |
| `/seguranca` | **Manter** | Diferencial para clientes enterprise: tenant isolation, PII. |
| `/privacidade` | **Manter** | Obrigatório LGPD. |
| `/termos` | **Manter** | Obrigatório legal. |
| `/piloto` | **Manter** | CTA primário da jornada de conversão. |

### Candidatos a Consolidação (Pós-Aprovação)

| Rota | Ação | Destino |
|------|------|---------|
| `/crm-whatsapp` | **Consolidar** | Seção "Fase 1: Atendimento" em `/produto` |
| `/logistica-pedidos` | **Consolidar** | Seção "Fases 2-3: Frete/Pedidos" em `/produto` |
| `/cockpit-gerencial` | **Consolidar** | Seção "Fase 4: Cockpit" em `/produto` |
| `/proof` | **Consolidar** | Bloco "Resultados Comprovados" na Home ou `/produto` |
| `/contato` | **Consolidar** | Formulário embutido em `/piloto` |
| `/faq` | **Consolidar** | Accordion em `/produto` ou `/piloto` |

### Candidatos a Remoção (Pós-Aprovação)

| Rota | Ação | Justificativa |
|------|------|---------------|
| `/plataforma` | **Remover** | Redirect já existe para `/produto`. Página ativa é redundante. |
| `/tecnologias` | **Remover** | Redirect já existe para `/produto`. Stack técnico não é diferencial primário. |
| `/solucoes` | **Remover** | Conteúdo duplicado de `/produto`. |
| `/gargalos-logisticos` | **Remover** | SEO bait desalinhado com posicionamento atual. |
| `/implantacao` | **Remover** | Conteúdo premature, implantação é feita pela equipe. |
| `/integracoes` | **Remover** | Integrações ERP/WMS/fiscal são Frozen. |
| `/showcase` | **Remover** | Conteúdo estático não mantido. |
| `/valores` | **Remover** | Missão pode ficar no footer, não precisa de página própria. |
| `/planos/domine` | **Remover** | DOMINE é superfície Frozen. |
| `/docs` | **Avaliar** | Verificar se tem tração SEO. Se não, remover. |
| `/area-estudo/*` | **Remover** | Experimental não-mvp. |

### Frozen / Sem Toque

| Área | Motivo |
|------|--------|
| `/concept-layer*` | Superfície experimental congelada |
| `/planos/domine` | DOMINE Console = Frozen |
| Qualquer ERP/WMS | Integração deferred |

---

## 4. Arquitetura Proposta das Páginas Públicas

### Estrutura Canônica Alvo (6 Páginas Core)

Após consolidação e aprovação, o site público deve ter:

| # | Rota | Função | Status |
|---|------|--------|--------|
| 1 | `/` | Home — Hero, Value Prop, Prova Social | Core |
| 2 | `/produto` | CONDSTORE OS — 4 fases, CRM+Logística+Cockpit como narrativa | Core |
| 3 | `/como-funciona` | Fluxo supervisionado passo a passo | Core |
| 4 | `/ia-frank` | Frank AI — Copiloto Supervisionado, limites, tool-guard | Core |
| 5 | `/seguranca` | Segurança, PII, Tenant Isolation, LGPD | Core |
| 6 | `/piloto` | Avaliação Operacional Assistida — CTA principal | Core |
| + | `/privacidade`, `/termos` | Páginas legais obrigatórias | Utilitárias |

### Hierarquia de Componentes (design system)

```
(public)/layout.tsx
├── SiteHeader          → Nav iOS-style (blur background, transparent)
├── {children}          → Conteúdo específico da página
│   ├── PageHero        → Bloco hero com headline + CTA
│   ├── SiteSection     → Seção agrupada, cards limpos, dividers sutis
│   ├── FeatureCard     → Card individual: ícone + título + descrição
│   ├── ProcessStep     → Passo numerado do fluxo supervisionado
│   └── SocialProof     → Logos / métricas de resultados
└── SiteFooter          → Links legais, contato, status
```

### Layout Engine

- **Unidade base**: 4px (grid de 8px para espaçamentos principais)
- **Container**: `max-w-5xl mx-auto px-4 sm:px-6`
- **Breakpoints**: mobile-first, `sm:`, `lg:` como principais
- **Animações**: `transition-all duration-200` para hover states

---

## 5. Narrativa Revisada do Ecossistema CONDSTORE OS

### Posicionamento

> **CONDSTORE OS é um Sistema Operacional Supervisionado para Distribuidoras.**
> Não é um chatbot. Não é automação cega. É um copiloto que amplifica o operador humano.

### A Jornada Operacional em 4 Fases

```
Fase 1: ATENDIMENTO
WhatsApp → Frank (AI) sugere → Operador aprova → Cliente recebe
           ↓
Fase 2: COTAÇÃO DE FRETE
Pedido confirmado → Frank consulta transportadoras → Operador escolhe
           ↓
Fase 3: PEDIDO & SHIPMENT
Pedido criado → Rastreamento gerado → Status atualizado automaticamente
           ↓
Fase 4: COCKPIT DE OPERAÇÃO
Dashboard em tempo real → Filas → Alertas → Métricas de desempenho
```

### Princípios Narrativos

1. **Human-in-the-Loop**: Frank nunca age sem aprovação do operador
2. **Visibilidade Total**: Cada ação gera rastro auditável
3. **Escala sem Caos**: Múltiplos atendimentos simultâneos com controle
4. **Frete Inteligente**: Multicarrier com circuit breaker e fallback

### Claims Verificáveis (baseados em `docs/marketing-claims.md`)

- Cotações de frete em < 3s
- Isolamento por tenant (zero cross-data)
- Rastro de decisão completo (audit log)
- Supervisão em 100% das respostas de Frank

---

## 6. Brief para Figma — Direção Visual

### Estética: "iOS Settings — Operacional Clean"

**Princípio**: Clareza operacional primeiro. Beleza como consequência da funcionalidade, não como decoração.

### Paleta de Cores

```
Fundo Principal:    #FFFFFF (Light) / #0A0A0A (Dark)
Fundo Secundário:   #F5F5F7 (Light) / #141414 (Dark)
Borda/Divisor:      rgba(0,0,0,0.08) (Light) / rgba(255,255,255,0.06) (Dark)
Texto Principal:    #000000 (Light) / #FFFFFF (Dark)
Texto Secundário:   #6E6E73 (Light) / #86868B (Dark)

Azul — Primário (ações, links):      #0070F3
Azul Escuro (hover):                 #0058C0
Vermelho — Alerta (crítico, kill):   #EF4444
Verde — Sucesso (aprovado):          #22C55E
Âmbar — Atenção:                     #F59E0B
```

### Tipografia

```
Font Family: Inter (Variable)
Headings:    700 weight, -0.04em letter-spacing
Body:        400 weight, 0em letter-spacing, line-height: 1.6
Caption:     400 weight, #6E6E73, 12-13px
Monospace:   JetBrains Mono (para status, IDs, tokens)
```

### Componentes-Chave para Figma

1. **Nav Bar** — blur + transparência, items espaçados, sem borda inferior fixa
2. **Hero Section** — headline impactante (48-60px), subtítulo em cinza, 2 CTAs (primário azul + secundário ghost)
3. **Feature Grid** — 2-3 colunas, cards com cantos arredondados (12px), padding 24px, ícone Lucide top-left
4. **Process Steps** — numeração circular azul, linha de progresso, copy curto
5. **Social Proof** — logos monocromáticos, métricas numéricas grandes
6. **Footer** — minimalista, 2 colunas, links em cinza, sem bordas pesadas

### Hipóteses de Design (Para Validação em Figma — NÃO implementar agora)

- **Glassmorphism**: Cards com `backdrop-filter: blur(16px)` e `background: rgba(255,255,255,0.08)` em seções de hero
- **Ecosystem Wheel**: Diagrama interativo mostrando as 4 fases como roda de fluxo — WhatsApp → Cotação → Pedido → Cockpit
- **Micro-animações**: Fade-in com `IntersectionObserver` para seções na home

---

## 7. Riscos de Acoplamento Marketing × Cockpit

### Risco 1 — CSS Leakage (Alto)

**Problema**: Estilos globais de marketing (reset agressivo, variáveis CSS) podem vazar para o Cockpit operacional.

**Impacto**: Layout quebrado em `/cockpit`, formulários com tamanhos incorretos, inputs distorcidos.

**Mitigação obrigatória antes de qualquer implementação**:
- Garantir que `(public)/layout.tsx` não instancia o mesmo Provider que `(cockpit)/layout.tsx`
- Isolar variáveis CSS de marketing em `:root` condicionado ou em classe `.site-marketing`
- Auditar `globals.css` para identificar resets que afetam seletores sem classe

### Risco 2 — Conflito de Tema (Médio)

**Problema**: Dark mode no site público pode conflitar com preferências do Cockpit.

**Impacto**: Flash de tema errado ao navegar de `/` para `/cockpit`.

**Mitigação**: Usar `data-theme` attribute no `<html>` controlado por layout, não por `prefers-color-scheme` global.

### Risco 3 — Complexidade de Middleware (Médio)

**Problema**: Redirects do `next.config.mjs` para rotas legadas podem interceptar paths protegidos indevidamente.

**Impacto**: Usuário autenticado sendo redirecionado de `/cockpit/produto` para `/produto` inesperadamente.

**Mitigação**: Garantir que redirects usem `missing: [{ type: 'cookie', key: 'session' }]` para não afetar sessões autenticadas.

### Risco 4 — QA Test IDs (Baixo/Controlado)

**Problema**: Qualquer mudança em `data-testid` quebra o `qa-snapshots.ts`.

**IDs Críticos que NUNCA podem ser removidos sem atualizar QA**:
- `public-hero-title` — usado na home (`/`)
- `public-primary-cta` — usado na home (`/`)
- `login-build-label` — usado no safe-mode de autenticação
- `public-docs-content` — usado na rota `/docs`
- `pricing-hero`, `pricing-plans`, `pricing-plan-card`, `pricing-plan-price` — usados em `/planos/envios`

### Risco 5 — Rotas com Teste de QA (Alto — Blocker atual)

**Problema**: O `qa-snapshots.ts` testa rotas que existem atualmente em `(public)/`. Qualquer PR que delete essas rotas SEM atualizar o QA quebrará o CI.

**Rotas atualmente testadas pelo QA**:
```
/ → public-hero-title, public-primary-cta
/docs → "Documentação", public-docs-content
/planos/envios → pricing-hero, pricing-plans, pricing-plan-card, pricing-plan-price
/cockpit/* → via sessão bootstrapped
```

**Ação obrigatória**: Toda PR que remove ou renomeia uma dessas rotas DEVE atualizar `scripts/qa-snapshots.ts` simultaneamente.

---

## 8. Plano Incremental Pós-Aprovação

> Este plano só deve ser executado **após aprovação formal desta documentação** por revisão humana.

### Fase 0 — Pre-flight (Bloqueante)

- [ ] Auditoria de `globals.css` para identificar resets não-isolados
- [ ] Validar que `(public)/layout.tsx` e `(cockpit)/layout.tsx` não compartilham Providers conflitantes
- [ ] Decidir estratégia de dark mode (attribute vs. media query)
- [ ] Definir com o time quais rotas serão efetivamente removidas vs. mantidas

### PR-A — Base Components (Marketing Design System)

**Escopo**: Criar/atualizar componentes em `src/ui/site/` com o design iOS-clean
- `SiteHeader` com blur nav
- `SiteSection` com dividers sutis
- `SiteCard` com cantos 12px
- `SiteTypography` com hierarquia Inter

**Critério de aceite**: Componentes isolados funcionando em Storybook ou página de preview. Zero impacto no Cockpit.

### PR-B — Home Canônica (Polimento)

**Escopo**: Atualizar `(public)/page.tsx` com o design aprovado no Figma
- Preservar `data-testid="public-hero-title"` e `data-testid="public-primary-cta"`
- Não remover nenhum testId existente

**Critério de aceite**: `qa-snapshots.ts` verde localmente antes do push.

### PR-C — Produto Consolidado

**Escopo**: Atualizar `(public)/produto/page.tsx` para consolidar narrativas de CRM, Logística e Cockpit como seções internas

**Critério de aceite**: Redirects de `/crm-whatsapp`, `/logistica-pedidos` funcionando. Seções com âncoras.

### PR-D — Consolidação e Cleanup

**Escopo**: Remover páginas candidatas a remoção (ver Seção 3), atualizar redirects, atualizar QA

**Critério de aceite**:
1. Rotas removidas retornam 404 ou redirect correto
2. `qa-snapshots.ts` atualizado e verde
3. Nenhuma rota do Cockpit afetada

### PR-E — Páginas Frank e Segurança

**Escopo**: Polimento visual de `/ia-frank` e `/seguranca` com novo design system

**Critério de aceite**: Aprovação visual em PR review. Sem breaking changes no layout.

---

## 9. Critérios para Futuras Issues Linear

> Issues Linear **NÃO** devem ser criadas nesta PR. Este documento define apenas os critérios.

### Critério de Granularidade

- **1 issue por página** para as 6 páginas core (Home, Produto, Como Funciona, Frank, Segurança, Piloto)
- **1 issue por componente base** do design system (Header, Section, Card, Footer)
- **1 issue de cleanup** por grupo de remoções (rotas legadas)
- **1 issue de QA** para atualização do `qa-snapshots.ts` após cada remoção

### Critério de Prioridade

- **P0**: Qualquer mudança que afete `qa-snapshots.ts` ou quebra CI
- **P1**: Páginas core (Home, Produto, Frank)
- **P2**: Design system base components
- **P3**: Cleanup de rotas legadas
- **Deferred**: Anything Frozen (DOMINE, ERP/WMS, concept-layer)

### Template de Issue

```
Título: [Site Público] <Ação> — <Página/Componente>
Labels: frontend, site-público, <p0|p1|p2|p3>
Description:
  - Contexto: Referência a esta documentação (docs/public-site-architecture.md)
  - Objetivo: O que precisa ser feito
  - Critério de DONE:
    * QA verde (qa-snapshots.ts)
    * Zero impacto no Cockpit
    * Typecheck e lint passando
    * Aprovação visual em PR review
  - Não fazer: O que está fora do escopo (Frozen surfaces)
```

### Dependências entre Issues

```
PR-A (Base Components) 
  └─ PR-B (Home)
       └─ PR-C (Produto Consolidado)
            └─ PR-D (Cleanup)
                 └─ PR-E (Frank + Segurança)
```

---

## Apêndice A — Trabalho de Implementação da PR Anterior (Follow-Up)

> Os itens abaixo foram identificados durante a execução desta P1. Não foram incluídos nesta PR por violarem o escopo documental. Devem ser tratados em PRs específicas após aprovação desta documentação.

### 1. Consolidação (marketing) × (public)

Durante a execução, foi identificado que existem dois grupos de rotas (`(marketing)` e `(public)`) com sobreposição de função. A proposta de unificação sob `(marketing)` precisa ser discutida e aprovada antes de implementação, pois impacta:
- Redirects em `next.config.mjs`
- `qa-snapshots.ts` (testIds hardcoded para rotas de `(public)`)
- Layout e Providers compartilhados

**Recomendação**: Tratar em PR-D, após todas as páginas core estarem no novo design system.

### 2. Página `/governanca`

Uma nova página `/governanca` foi prototipada durante a execução. O conteúdo (transparência, termos, privacidade consolidados) é válido, mas a implementação ficou para pós-aprovação deste documento. Deve ser criada como issue Linear com critério de aceite claro.

### 3. Scripts ClickUp Adicionais

Scripts de reporting foram desenvolvidos durante a execução (`post-p0-report.ts`, `post-task-report.ts`, etc.). São úteis para automação de relatórios mas extrapolaram o escopo desta PR. Devem ser avaliados e incluídos na pasta `tools/clickup/scripts/` via PR separada.

---

*Documento criado em: 2026-05-11*
*Autores: Antigravity Agent (P1 — Site Público Autoral e Profissional)*
*Aprovação requerida de: [Revisor Human] antes de qualquer implementação*
