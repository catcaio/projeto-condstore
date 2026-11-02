# Proposta de Identidade Visual Institucional — CONDSTORE OS

> **Versão:** 1.1.0-draft
> **Status:** Proposta Técnica em Fase 1 / Aguardando Homologação Visual do Mantenedor (Issue #442 / PR #443)
> **Referência:** Issues #419, #420 e Contrato do Design System Público (`docs/frontend-public-design-system.md`)

---

## 1. Rationale e Conceito Institucional

O **CONDSTORE OS** é uma plataforma operacional para comércio eletrônico e distribuição ("Da conversa ao caminhão, sem perder o fio").
Esta proposta visa estabelecer uma identidade visual institucional unificada, modular e de alta precisão, preservando a usabilidade e os tokens semânticos públicos existentes.

### Conceito Proposto: *Constelação Estruturada + Nó Contínuo*
Composição modular de elementos geométricos complementares com cantos em raio contínuo (superelipse / squircle), alinhados em grid ortogonal, onde a integração entre etapas operacionais é transmitida pela proximidade, nós de sincronização e espaço negativo.

- **Foco Institucional:** Representa o Condstore OS como ecossistema completo de software.
- **Desacoplamento do Agente:** A inteligência artificial Frank opera como ferramenta supervisionada e co-piloto; Frank não é mascote nem núcleo mandatório da marca.
- **Isenção de Clichês:** Sem robôs, circuitos estilizados, ícones genéricos de chip ou grafismos transitórios.

---

## 2. As Três Variações Candidatas do Símbolo

Nenhuma das variações está homologada como definitiva. Todas as 3 variantes abaixo são propostas ativas submetidas à avaliação visual do mantenedor:

| Candidata | Geometria e Conceito | Aplicação / Comportamento | Status |
|---|---|---|---|
| **Candidata 1 (V1) — Nó Modular 2×2** | 4 módulos em superelipse alinhados em grid 2×2, com núcleo de sincronização no quadrante superior direito e conexões em espaço negativo. | Excelente estabilidade ótica; alta legibilidade comprovada em 16×16px e 32×32px; funciona perfeitamente em silhueta pura e monocromia. | **Candidata A** (Aguardando Aprovação) |
| **Candidata 2 (V2) — Constelação Tri-nó** | 3 módulos em superelipse orbitando um centro comum, representando o tripé Atendimento, Cotação e Expedição. | Dinamismo angular e forte presença em materiais de arquitetura, selos e badges técnicos. | **Candidata B** (Aguardando Aprovação) |
| **Candidata 3 (V3) — Loop do Fio da Operação** | 2 arcos entrelaçados formando a curva contínua de um monograma 'C' e 'O' implícito através do traçado. | Forte conexão com a narrativa "sem perder o fio"; estética fluida e contínua. | **Candidata C** (Aguardando Aprovação) |

---

## 3. Assinatura Tipográfica (Wordmark)

A assinatura institucional estabelece contraste tipográfico deliberado entre o nome da empresa e o sufixo de sistema:

- **CONDSTORE**:
  - Caixa: Alta
  - Peso: Bold (700)
  - Tracking: `-0.01em` (-1%)
  - Cor: `hsl(var(--ui-text))`
- **OS**:
  - Caixa: Alta
  - Peso: Medium (500)
  - Tracking: `+0.05em` (+5%)
  - Cor: `hsl(var(--ui-accent-blue))` ou renderizado em `SiteBadge` discreto com borda sutil.

### Formatos Disponíveis para Inspeção
1. **Horizontal:** Símbolo à esquerda + Wordmark à direita (padrão em barras de navegação).
2. **Vertical:** Símbolo acima + Wordmark centralizado (padrão em cartões de autenticação e capas).
3. **Símbolo Apenas:** Sem tipografia (para docks compactos, favicons e avatares).

---

## 4. Escolha e Mecanismo Tipográfico

### Fonte Primária Proposta: Plus Jakarta Sans
- **Família:** *Plus Jakarta Sans* (SIL Open Font License 1.1).
- **Mecanismo de Carregamento:** Carregada de forma não-bloqueante no ecossistema de estilos globais via Google Fonts CDN (`display=swap`), com cadeia de fallback universal estrita para ambientes offline ou headless:
  ```css
  font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
  ```
- **Justificativa:** Geometria contemporânea, curvas circulares harmonizadas com os squircles do símbolo, x-height generoso para telas compactas e excelente distinção de caracteres.

### Fonte Monoespaçada: JetBrains Mono
- **Uso:** Restrita estritamente a dados técnicos (IDs, CEP, JSON, logs operacionais e payloads).
- **Regra:** Métricas operacionais gerais e valores financeiros usam a fonte primária com algarismos tabulares (`tabular-nums font-semibold`), garantindo ritmo de leitura sem aridez de terminal.

---

## 5. Auditoria de Contraste e Cores (WCAG 2.1)

A paleta de marca utiliza exclusivamente os tokens do Design System público (`docs/frontend-public-design-system.md`). Abaixo estão os contrastes **objetivamente medidos e calculados**:

| Superfície de Teste | Elemento Testado | Cor / Token | Ratio Calculado | Nível WCAG 2.1 | Status |
|---|---|---|---|---|---|
| **Página Clara** (`#F8F9FA`) | Texto Primário | `#0E1117` (`--ui-text`) | **17.93:1** | WCAG AAA (> 7:1) | Aprovado |
| **Card Claro** (`#FFFFFF`) | Texto Primário | `#0E1117` (`--ui-text`) | **18.90:1** | WCAG AAA (> 7:1) | Aprovado |
| **Página Clara** (`#F8F9FA`) | Texto Suave / Metadados | `#64748B` (`--ui-text-muted`) | **4.51:1** | WCAG AA (> 4.5:1) | Aprovado |
| **Página Clara** (`#F8F9FA`) | Acento Azul Elétrico | `#0066FF` (`--ui-accent-blue`) | **4.59:1** | WCAG AA (> 4.5:1) | Aprovado |
| **Card Claro** (`#FFFFFF`) | Acento Azul Elétrico | `#0066FF` (`--ui-accent-blue`) | **4.83:1** | WCAG AA (> 4.5:1) | Aprovado |
| **Página Escura / Cockpit** (`#12151E`) | Texto Primário | `#F3F5F8` (`--ui-text`) | **16.69:1** | WCAG AAA (> 7:1) | Aprovado |
| **Card Escuro / Cockpit** (`#1A1F2C`) | Texto Primário | `#F3F5F8` (`--ui-text`) | **15.07:1** | WCAG AAA (> 7:1) | Aprovado |
| **Página Escura / Cockpit** (`#12151E`) | Texto Suave / Metadados | `#94A3B8` (`--ui-text-muted`) | **7.11:1** | WCAG AAA (> 7:1) | Aprovado |
| **Página Escura / Cockpit** (`#12151E`) | Acento Azul Elétrico | `#3395FF` (`--ui-accent-blue`) | **5.98:1** | WCAG AA (> 4.5:1) | Aprovado |
| **Card Escuro / Cockpit** (`#1A1F2C`) | Acento Azul Elétrico | `#3395FF` (`--ui-accent-blue`) | **5.39:1** | WCAG AA (> 4.5:1) | Aprovado |

### 5.1 Matriz de Legibilidade Ótica em Reduções Extremas (16px e 32px)

| Variante | Comportamento em 32×32px (Dock / Barra de Ferramentas) | Comportamento em 16×16px (Favicon / Aba do Navegador) | Avaliação Objetiva de Legibilidade |
|---|---|---|---|
| **V1 (Matriz Conectada 2×2)** | 4 superelipses nítidas com fresta ortogonal visível; núcleo azul elétrico perfeitamente diferenciado. | Silhueta em bloco 2×2 robusta e reconhecível de imediato. O ponto interno de 1.5px sofre fusão subpixel em telas 1x, pelo que o favicon dedicado (`public/favicon.svg`) utiliza dimensões compensadas para manter o ponto visível. | **Excelente em 32px e 16px**. Variante com maior estabilidade formal em baixa resolução. |
| **V2 (Constelação Tri-módulo)** | Geometria de 3 nós complementares com módulo superior em destaque azul; espaçamentos angulares legíveis. | Os 3 blocos formam uma pirâmide reconhecível; o ponto central diminui para escala subpixel (~1.2px) e tem baixa saliência visual em 16px. | **Muito boa em 32px; moderada em 16px**. |
| **V3 (Loop / Fio Contínuo)** | Traçado espesso de 14px em vetor renderiza com clareza em 32px (~4.5px de espessura de traço). | Curva contínua em 'C'/'O' mantém traçado legível de ~2.2px de espessura ótica. | **Alta iconicidade visual em 16px** devido à espessura contínua do traço. |
| **Monocromática Pura (`mono`)** | Recorte circular no quadrante superior direito nítido via máscara vetorial nativa (`mask`), sem depender de cor nem de tokens da aplicação. | Em 16px, o anel vazado exige alta densidade de pixels (display Retina/HiDPI); em telas padrão 1x o furo central sofre leve antialiasing cinza. | **Conformidade técnica estrita** com independência total de temas e fundos. |

---

## 6. Monocromia e Escala Mínima

### Regras do Símbolo Monocromático
A versão monocromática (`mono`) opera puramente por silhueta e espaço negativo (`currentColor`), sem depender de transparências com alfa baixo ou gradientes coloridos:
- No quadrante superior direito (antigo acento colorido), a versão monocromática utiliza um anel/vazado contrastante que separa o núcleo central mesmo quando renderizado em tinta preta 100% sobre fundo branco ou tinta branca 100% sobre fundo escuro.
- **Redução Mínima:** 16×16px (legível em abas de navegador) e 32×32px (ícones de dock).
- **Favicon Dinâmico:** Implementado com media query CSS interna (`prefers-color-scheme`), adaptando as cores base automaticamente entre abas escuras e claras do navegador.

---

## 7. Rota de Homologação / Artefato Comparativo

Para visualização interativa das 3 candidatas lado a lado, em diferentes escalas e temas, consulte a rota de preview:
- **URL Local / Preview:** `/brand-preview`
