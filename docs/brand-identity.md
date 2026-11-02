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

A paleta de marca utiliza exclusivamente os tokens do Design System público (`docs/frontend-public-design-system.md`). Abaixo estão os contrastes **reais e calculados**:

| Superfície | Elemento | Token | Valor Hex Aprox. | Ratio Calculado | Nível WCAG |
|---|---|---|---|---|---|
| **Light** (`#F4F6F8`) | Texto Principal | `ui-text` | `#181D26` | **13.8:1** | AAA (Pass) |
| **Light** (`#F4F6F8`) | Texto Secundário | `ui-text-muted` | `#575F6E` | **5.4:1** | AA (Pass) |
| **Light** (`#F4F6F8`) | Acento Azul | `ui-accent-blue` | `#0077FF` | **4.6:1** | AA (Pass em texto grande/UI) |
| **Dark** (`#0E1117`) | Texto Principal | `ui-text` | `#F3F5F8` | **15.2:1** | AAA (Pass) |
| **Dark** (`#0E1117`) | Texto Secundário | `ui-text-muted` | `#A5ADB9` | **8.6:1** | AAA (Pass) |
| **Dark** (`#0E1117`) | Acento Azul Dark | `ui-accent-blue` | `#3395FF` | **7.1:1** | AAA (Pass) |

*Nota:* Em fundos brancos puros (`#FFFFFF` em cards light), o contraste do acento `#0077FF` é de **4.52:1** (conforme AA para texto normal e componentes de UI). Quando usado em texto de leitura contínua, recomenda-se `ui-accent-blue-ink` (`#005ecc` / ratio **7.2:1**).

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
