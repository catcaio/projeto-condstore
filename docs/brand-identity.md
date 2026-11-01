# Guia de Identidade Visual Institucional — CONDSTORE OS

> **Versão:** 1.0.0
> **Status:** Homologada / Produção Controlada
> **Referência:** Issues #419, #420 e Contrato do Design System Público (`docs/frontend-public-design-system.md`)

---

## 1. Rationale e Conceito Institucional

O **CONDSTORE OS** é um sistema operacional completo para o varejo e distribuição moderna ("Da conversa ao caminhão, sem perder o fio"). Sua identidade visual precisa comunicar:
1. **Integração e Fluidez:** continuidade entre os elos da operação (atendimento, pedido, cotação e expedição).
2. **Modularidade e Arquitetura Robusta:** componentes geométricos que se encaixam e operam em harmonia.
3. **Complexidade Resolvida:** ordem e clareza visual sem rigidez excessiva.
4. **Independência Tecnológica:** a plataforma é o Condstore OS como ecossistema; o agente Frank IA é um operador supervisionado e co-piloto, não o núcleo conceitual ou mascote da marca.

### Conceito Aprovado: *Constelação Estruturada + Nó Contínuo*
Composição de módulos geométricos complementares com cantos de raios contínuos (superelipses / squircles), alinhados em grid ortogonal preciso, com conectividade sugerida através do espaço negativo e nós de sincronização. Evita clichês literais (robôs, cérebros, circuitos pontilhados ou ícones genéricos de inteligência artificial).

---

## 2. As Três Variações do Símbolo

Dentro do conceito unificado, foram desenvolvidas e prototipadas 3 variações geométricas:

| Variação | Conceito Geométrico | Aplicação / Destaque | Status |
|---|---|---|---|
| **V1 — Nó Modular Contínuo (Primária)** | 4 módulos em superelipse dispostos em grid 2×2, conectados por um nó central em cruz contínua e chanfros de encaixe. | Símbolo padrão institucional. Máxima nitidez em 16×16px e 32×32px, peso ótico balanceado, funciona perfeitamente em positivo/negativo e monocromático puro. | **Recomendada / Oficial** |
| **V2 — Constelação Hexagonal Tri-nó** | 3 módulos operacionais em órbita dinâmica em torno de um núcleo comum triangular, simbolizando Conversa, Cotação e Carga. | Identidade complementar para diagramas de arquitetura, selos técnicos e ilustrações de ecossistema. | Alternativa Homologada |
| **V3 — Fio Dinâmico / Loop Contínuo** | 2 arcos entrelaçados em superelipse formando um monograma 'C' e 'O' implícito através do espaço negativo ("O Fio da Operação"). | Aplicação em mídias dinâmicas e ícones reduzidos de barra lateral. | Alternativa Homologada |

---

## 3. Assinatura Tipográfica (Wordmark)

A assinatura tipográfica do **CONDSTORE OS** estabelece diferenciação ótica deliberada entre o nome da marca e o sufixo de plataforma operacional:

- **CONDSTORE**:
  - Caixa: Alta
  - Peso: Semi-Bold / Bold (600–700)
  - Tracking: `-0.01em` (-1%)
  - Cor: `hsl(var(--ui-text))` (grafite profundo no light, off-white no dark)
- **OS**:
  - Caixa: Alta
  - Peso: Medium (500)
  - Tracking: `+0.05em` (+5%)
  - Cor: `hsl(var(--ui-accent-blue))` (azul elétrico institucional) ou renderizado como Badge neutro discreto (`SiteBadge muted/accent`).

### Formatos de Assinatura
1. **Horizontal Oficial:** Símbolo à esquerda (proporção 1:1) + Espaço de respiro (0.75x) + Wordmark tipográfico com baseline alinhada.
2. **Compacto / Símbolo Apenas:** Símbolo isolado em container quadrado ou superelíptico (usado na sidebar compacta do Cockpit e no Favicon).
3. **Vertical / Centralizado:** Símbolo centralizado acima do Wordmark (usado em telas de login, apresentações institucionais e splash screens).

---

## 4. Escolha e Hierarquia Tipográfica

### Fonte Primária: Plus Jakarta Sans (com Fallback Universal)
- **Seleção:** *Plus Jakarta Sans* (Google Fonts / SIL Open Font License 1.1).
- **Justificativa:** Proporções geométricas limpas, grande x-height, excelente legibilidade em telas de alta densidade e dispositivos móveis, suporte nativo a algarismos tabulares (`tnum`) para tabelas financeiras e operacionais sem distorção.
- **Pilha de Fallback:**
  ```css
  font-family: "Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  ```

### Fonte Monoespaçada: JetBrains Mono
- **Seleção:** *JetBrains Mono* (OFL 1.1).
- **Uso Estrito:** Restrita a identificadores técnicos (IDs de rastreio, hashes de pedidos, logs do Frank, payloads JSON e payloads de webhooks).
- **Regra de Uso:** Métricas numéricas e valores em reais (R$) utilizam algarismos tabulares da fonte primária (`tabular-nums font-semibold`), garantindo leitura natural sem estética crua de terminal.

### Escala Tipográfica Institucional e Operacional

| Nível / Uso | Peso | Tamanho Desktop | Tamanho Mobile | Line-height | Tracking |
|---|---|---|---|---|---|
| **Hero Institucional** | 700 (Bold) | `48px` (3rem) | `32px` (2rem) | `1.15` | `-0.02em` |
| **H1 Seções / Páginas** | 700 (Bold) | `32px` (2rem) | `24px` (1.5rem) | `1.20` | `-0.02em` |
| **H2 Subseções / Cards** | 600 (SemiBold) | `20px` (1.25rem) | `18px` (1.125rem) | `1.30` | `-0.01em` |
| **H3 / Rótulos de Grupo** | 500 (Medium) | `16px` (1rem) | `15px` (0.9375rem) | `1.40` | `0` |
| **Body Texto Corrido** | 400 (Regular) | `14px` (0.875rem) | `14px` (0.875rem) | `1.50` | `0` |
| **Metadados / Eyebrow** | 500 (Medium) | `12px` (0.75rem) | `12px` (0.75rem) | `1.40` | `+0.04em` |
| **Mono Conteúdo Técnico** | 500 (Medium) | `13px` (0.8125rem) | `12px` (0.75rem) | `1.40` | `0` |

---

## 5. Paleta de Cores e Mapeamento com Design System Público

Para preservar 100% da usabilidade existente e impedir bifurcação de regras com o issue #420, a identidade visual mapeia diretamente para os tokens semânticos `ui-*` definidos em `src/app/globals.css`:

| Função da Marca | Token Oficial | Valor Light (HSL / Hex Aprox) | Valor Dark (HSL / Hex Aprox) | Ratio Contraste WCAG |
|---|---|---|---|---|
| **Base Neutra (Página)** | `ui-page` | `220 18% 96%` (~#F4F6F8) | `224 20% 8%` (~#0E1117) | — |
| **Superfície Institucional** | `ui-surface` | `0 0% 100%` (#FFFFFF) | `224 17% 11%` (~#131722) | — |
| **Texto Principal** | `ui-text` | `222 20% 12%` (~#181D26) | `210 18% 96%` (~#F3F5F8) | > 14:1 (AAA) |
| **Texto Suave / Muted** | `ui-text-muted` | `220 12% 38%` (~#575F6E) | `220 10% 68%` (~#A5ADB9) | > 5.5:1 (AA) |
| **Acento Elétrico (OS / Destaque)** | `ui-accent-blue` | `211 100% 50%` (~#0077FF) | `211 100% 60%` (~#3395FF) | > 4.5:1 (AA) |
| **Acentos Suaves Complementares** | `ui-muted` | `220 20% 94%` | `224 14% 17%` | Bordas e tags sutis |

---

## 6. Normas de Aplicação e Geometria do Símbolo

### Grid e Área de Respiro
- **Grid Modular:** Base 8px (sistema 16px / 24px / 32px / 48px).
- **Área de Respiro Mínima:** Definida pelo valor `X`, correspondente à metade da largura de um dos módulos do símbolo. Nenhum elemento de texto ou interface gráfica pode invadir este raio de isolamento.
- **Redução Mínima:**
  - Aplicação com Wordmark: Altura mínima de `24px`.
  - Símbolo isolado (Favicon / App Icon): `16×16px`. Os vetores foram desenhados com espessuras óticas compensadas para manter legibilidade em 16px sem perda de separação dos módulos.

### Regras de Ouro (Invariantes da Marca)
1. **Nunca depender de gradiente:** A forma deve ser 100% reconhecível em silhueta pura de uma única cor (`currentColor` / monocromático).
2. **Nunca distorcer proporções:** Manter escala `1:1` no símbolo e nas distâncias dos módulos.
3. **Sem sombras falsas ou brilhos exagerados:** Evitar efeitos pseudo-3D, reflexos de vidro ou glows que comprometam a fidelidade no fundo claro.
4. **Preservação de Nome:** A marca é estritamente **CONDSTORE OS** em todas as menções formais.
