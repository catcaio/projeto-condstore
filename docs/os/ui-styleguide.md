# Condstore OS — UI Style Guide

> **Status:** Scaffolding v0.1 — componentes base criados, sem implementação completa de navegação.

## Filosofia Visual

O Cockpit do Condstore OS é inspirado no app **Configurações do iOS**: organização por listas agrupadas, hierarquia clara, sem ruído visual, e resposta imediata às ações do usuário. A interface é funcional, não decorativa.

---

## Design Tokens

Arquivo: `src/styles/tokens.css`

### Cores

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--os-bg` | `#f2f2f7` | `#1c1c1e` | Background da tela |
| `--os-surface` | `#ffffff` | `#2c2c2e` | Superfície de cards/células |
| `--os-text` | `#000000` | `#ffffff` | Texto primário |
| `--os-text2` | `#6c6c70` | `#8e8e93` | Texto secundário / valores |
| `--os-line` | `rgba(60,60,67,0.12)` | `rgba(84,84,88,0.65)` | Separadores / bordas |
| `--os-accent` | `#007aff` | `#0a84ff` | Ações / seleção / ativo |
| `--os-danger` | `#ff3b30` | `#ff453a` | Destrutivo / alertas |

### Raio de Borda

| Token | Valor | Uso |
|-------|-------|-----|
| `--os-radius-lg` | `12px` | Cards de seção |

### Espaçamentos

| Token | Valor | Uso |
|-------|-------|-----|
| `--os-section-gap` | `36px` | Distância entre seções |
| `--os-row-padding` | `16px` | Padding horizontal das linhas |
| `--os-row-height` | `44px` | Altura mínima das linhas (toque confortável) |

### Tipografia

| Token | Valor | Uso |
|-------|-------|-----|
| `--os-font-body` | `17px` | Texto principal (label) |
| `--os-font-footnote` | `13px` | Cabeçalho de seção / nota |
| `--os-font-caption` | `11px` | Metadados |

**Família:** `system-ui, -apple-system, BlinkMacSystemFont, sans-serif` — sem inventar fontes.

---

## Tema (Claro / Escuro / Sistema)

### Mecanismo

1. Default: `prefers-color-scheme` (via `@media`)
2. Override: `data-theme="light"` ou `data-theme="dark"` no elemento `<html>`
3. Sistema: remoção do atributo `data-theme` (volta ao comportamento do SO)
4. Persistência: `localStorage` com chave `condstore:theme`

### Anti-Flash

O `(cockpit)/layout.tsx` inclui um `<script>` inline síncrono que lê o `localStorage` e aplica `data-theme` antes do primeiro paint. Isso elimina o flash de tema incorreto na carga.

```html
<!-- Aplicado antes do React hidrar -->
<script>
  (function(){
    try {
      var t = localStorage.getItem('condstore:theme');
      if (t === 'dark' || t === 'light')
        document.documentElement.setAttribute('data-theme', t);
    } catch(e) {}
  })();
</script>
```

---

## Componentes

### TopBar

```
┌────────────────────────────────────┐
│ [← / X]   Título Central   [ℹ]    │
└────────────────────────────────────┘
```

- Altura: `44px`
- Fundo: `--os-surface` com separador inferior em `--os-line`
- Título: centralizado, `font-weight: 600`, `--os-text`
- Left action: botão com `aria-label`
- Right action: botão com `aria-label`

### GroupedSection

```
┌──────────────────────────────────────┐
│ TÍTULO DA SEÇÃO (caption, text2)     │
│ ┌────────────────────────────────┐   │
│ │         Célula 1               │   │
│ │─────────────────────────────── │   │
│ │         Célula 2               │   │
│ └────────────────────────────────┘   │
│  Rodapé opcional (footnote, text2)   │
└──────────────────────────────────────┘
```

- Surface: `--os-surface`, raio: `--os-radius-lg`
- Título: `text-transform: uppercase`, `font-size: --os-font-footnote`, `color: --os-text2`
- Separadores: `1px solid --os-line` entre células (não nas bordas externas)

### SettingsRow

```
│ [ícone]  Label          rightValue  ›  │
```

- Altura mínima: `--os-row-height`
- Padding: `0 --os-row-padding`
- Ícone: outline, `20×20px`, `stroke-width: 1.5`
- Chevron (`›`): opcional, `--os-text2`
- RightValue: `--os-text2`, `font-size: --os-font-body`

### ToggleRow

```
│  Label                    [  ●  ]  │
```

- Toggle "iOS style": `background: --os-accent` quando ativo, `--os-line` quando inativo
- Dimensões: `51×31px`, thumb `27×27px`
- `role="switch"` para acessibilidade

### ValueRow

```
│  Label              Valor   ›  │
```

Variante simplificada sem ícone, com valor à direita.

### DangerRow

```
│  Sair da conta                  │
```

- Label em `--os-danger`
- Centralizado na célula
- `role="button"` com `aria-label`

---

## Estados

| Estado | Visual |
|--------|--------|
| Default | Background: transparent |
| Pressed | Background: `--os-line` (15%) |
| Focused | Outline: `2px solid --os-accent` |
| Disabled | Opacidade: `0.38` |

---

## Regras de Acessibilidade

1. Todo botão/link com ação deve ter `aria-label` descritivo
2. Área de toque mínima: `44×44px` (WCAG 2.5.5)
3. Foco visível obrigatório (`outline: 2px solid --os-accent`)
4. Contraste mínimo: 4.5:1 para texto normal (WCAG AA)
5. Toggle com `role="switch"` e `aria-checked`

---

## Regras de Uso

- **Não misturar** grupos de settings em um único `GroupedSection`
- **Máximo** 8 linhas por `GroupedSection` (UX)
- **Não usar** cores fora do token system nos componentes OS
- **Não adicionar** decoração desnecessária (sombras pesadas, gradientes complexos)
- **Usar** separadores via CSS, nunca via elemento `<hr>` extra
