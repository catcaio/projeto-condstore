# Design System Público — CONDSTORE OS (S2, issue #420)

Fonte oficial da linguagem visual do frontend público, extraída da Home
(auditada na #419). Páginas públicas usam **tokens semânticos `ui-*`**;
valores arbitrários repetidos por página são exceção, não padrão.

Etapa: `#419 auditoria → #420 contrato → próximas issues: migração das páginas`.

## 1. Fonte oficial e relação entre famílias

| Família | Arquivo | Status para o frontend público |
|---|---|---|
| `ui-*` (page, surface, text, border, accent-blue, danger, success, **warning**) | `src/app/globals.css` (`:root`, `html[data-theme]`, `.site-light`, `.site-dark`) | **Oficial.** Única fonte para páginas públicas novas/ migradas. |
| Escala Tailwind (`spacing`, `fontSize body-*/heading-*`, `radius token-*`, `shadow token-*`, `13: 3.25rem`) | `tailwind.config.ts` | **Oficial complementar.** Mapeia tokens para utilitários. |
| `tokens.typography.css` (`--font-size-*`, `h1 36px/h2 30px/h3 24px`) | `src/styles/tokens.typography.css` | **Legado.** Serve superfícies não-públicas; não usar em páginas públicas novas. A Home usa a escala Tailwind (`text-3xl→6xl extrabold tracking-tight`), que é o contrato oficial. Migração futura, sem justificativa para dois contratos concorrentes. |
| `--os-*` / `--color-bg-*` / `--bg-*/--text-*` / `.glass-surface` | `src/styles/tokens.css`, `tokens.light/dark/semantic.css` | **Legado.** Não estender; novas páginas públicas não devem importar esses namespaces. |
| `surface-base/card/elevated`, `brand-primary/premium`, `cockpit-theme` | `src/app/globals.css` + `tailwind.config.ts` | **Suporte interno** (cockpit/premium). Não fazem parte do contrato público. |
| `--radius-card: 1.5rem` | `src/app/globals.css` | **Legado não usado pela Home.** O público usa `rounded-2xl` (1rem) para cards; o token permanece apenas por compatibilidade. |

Tema: `SiteThemeProvider` (`src/ui/site/theme-provider.tsx`) aplica
`.site-dark`/`.site-light` com `localStorage condstore-site-theme` →
`prefers-color-scheme: light` → fallback `dark`. É o tema oficial do site
público, separado do `ThemeProvider` global do `RootLayout`.

## 2. Tokens semânticos

### Color (`hsl(var(--ui-*))`, sempre via Tailwind arbitrário)

| Token | Light | Dark | Uso |
|---|---|---|---|
| `ui-page` | `220 18% 96%` | `224 20% 8%` | fundo da página (`main`, `body` do site) |
| `ui-surface` | `0 0% 100%` | `224 17% 11%` | cards, header/footer, simulador |
| `ui-surface-elevated` | `210 18% 98%` | `224 15% 14%` | superfícies internas, hover |
| `ui-muted` | `220 20% 94%` | `224 14% 17%` | chips mono, fundos neutros |
| `ui-border` / `ui-border-strong` | `220 16% 86%` / `220 14% 78%` | `223 12% 23%` / `223 10% 31%` | bordas sempre com alfa `/0.3–0.7`; divisórias `border-b .../0.4` |
| `ui-text` / `ui-text-muted` / `ui-text-subtle` | `222 20% 12%` / `220 12% 38%` / `220 10% 52%` | `210 18% 96%` / `220 10% 68%` / `220 8% 56%` | títulos / corpo / micro-copy e timestamps |
| `ui-accent-blue` (+strong/ink) | `211 100% 50/43/37%` | `211 100% 60/64/82%` | CTAs pill do shell, links de ênfase, ícones de feature |
| `ui-success` (+ink) | `145 66% 42%` / ink `145 72% 28%` | `145 60% 45%` / ink `145 82% 80%` | estados positivos, governança, selos |
| `ui-warning` (+strong/ink) — **novo nesta issue** | `32 95% 44%` / `28 90% 38%` / ink `32 85% 30%` | `38 95% 60%` / `43 96% 65%` / ink `45 100% 80%` | atenção. Antes referenciado em 16 pontos (`hero-section`, `proof`, `como-funciona`, cockpit) sem definição; agora definido nos 4 escopos |
| `ui-danger` (+strong/ink) | `4 90% 58%` / `4 84% 52%` / `4 72% 43%` | `4 82% 60%` / `4 84% 65%` / `4 100% 82%` | bloco “dor/zigue-zague”, erros. Uso contido. |

### Typography (contrato oficial = escala Tailwind usada pela Home)

| Nome | Classes | Uso |
|---|---|---|
| `display` | `text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12]` | H1 da Home |
| `heading-xl` | `text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]` | `SectionIntro` |
| `heading-lg` | `text-3xl sm:text-4xl font-extrabold tracking-tight` | H2 de seção |
| `heading-md` | `text-2xl sm:text-3xl font-extrabold tracking-tight` | H3 de bloco/demo |
| `body-lg` | `text-base sm:text-lg md:text-xl leading-relaxed text-ui-text-muted` | subtítulo hero, descrições |
| `body-md` | `text-sm sm:text-base leading-relaxed text-ui-text-muted` | corpo de cards |
| `body-sm` | `text-xs sm:text-sm` | listas, micro-benefícios |
| `label` | `text-xs font-semibold uppercase tracking-widest` | eyebrows |
| `caption` | `text-xs text-ui-text-subtle` / `text-[11px]` | timestamps, garantias |
| `mono` | `font-mono text-[10-11px] font-bold` | steps (`01–04`), IDs (`#4920`), códigos |

Família: `"SF Pro","Inter",system-ui,...` (sem `next/font`).

### Spacing

- Seções: `py-16 md:py-24` + `border-b border-ui-border/0.4` (ritmo oficial; `PageSection` oferece `sm/md/lg/xl`).
- Containers: `PageContainer` — `max-w-[var(--container-max-width)]` (80rem), `px-6 lg:px-8`, `narrow max-w-5xl`; copy central `max-w-3xl/4xl/5xl mx-auto text-center`.
- Gaps: `gap-3/4` (CTAs/cards), `gap-2.5` (ícone+texto), `space-y-4/6`, `p-6 sm:p-8/10/12` em cards.
- `h-13 = 3.25rem` (52px): usado pelos CTAs da Home; **não existia** na escala default do Tailwind v3 — formalizado em `tailwind.config.ts` nesta issue.

### Radius

| Nome | Valor | Uso |
|---|---|---|
| `pill` (`--radius-button`) | `9999px` | badges, CTAs do shell, chips |
| `card` (público) | `1rem` (`rounded-2xl`) | cards principais, simulador |
| `inner` | `0.75rem` (`rounded-xl`) | CTAs Home, cards internos, tabs, ícones `h-10/11` |
| `small` | `0.5rem/0.375rem` (`rounded-lg/md`) | stats, tags, URL pill |

### Elevation

`shadow-sm` (cards dor), `shadow-md` (CTAs, moments), `shadow-lg` (demo-card),
`shadow-2xl` (simulador) + glows `shadow-[accent-blue/0.06–0.2]` e
`--shadow-soft: 0 16px 40px -16px`. Sem `shadow-inner`. Blobs ambiente:
`blur-[100–140px]`, `bg-ui-border/0.15–0.2`, `backdrop-blur-sm/md/xl`.

### Motion

| Nome | Valor | Uso |
|---|---|---|
| `reveal` | `.sr-hidden → .sr-visible`, `opacity 0→1, translateY(20px→0), 0.6s ease-out`, `IntersectionObserver {threshold 0.1, rootMargin -40px}`, unobserve após exibir | `ScrollReveal` em todas as seções |
| `fade/slide` | `framer-motion AnimatePresence`, `y/x ±10, 0.25–0.3s` | troca de estágio hero/moments |
| `hover` | `transition-all (+duration-200/300)` | botões, cards, tabs, links |
| `press` | `active:scale-[0.99]` | CTAs Home |
| `pulse` | `animate-pulse/ping/spin` | dot “Contexto Ativo”, eyebrow, RefreshCw |
| `theme` | `background-color/color 0.3s ease` | troca `.site-dark/.site-light` |
| `autoplay` | `setInterval 4500ms` com pausa manual | `InteractiveHero` |
| `reduced-motion` | `prefers-reduced-motion` zera animation/transition e força `.sr-visible` | obrigatório em qualquer motion nova |

## 3. Primitivos oficiais

| Primitivo | Arquivo | Variantes |
|---|---|---|
| `SiteButton` | `src/ui/site/site-button.tsx` | `primary` (CTA Home `bg-ui-text`, h-13), `secondary` (borda strong), `accent` (pill `bg-accent-blue` do shell), `ghost` (link narrativo). Props: `href`, `testId` (repasse de `data-testid`). |
| `SiteBadge` | `src/ui/site/site-badge.tsx` | `default`, `success`, `warning`, `danger`, `accent`, `muted`. Base pill `px-3 py-1 text-xs font-semibold`. |
| `SiteCard` / `SiteFeatureCard` | `src/ui/site/site-card.tsx` | `default`, `elevated` (`shadow-lg`), `interactive` (hover da FeatureGrid). `SiteFeatureCard` = ícone `h-11 rounded-xl bg-accent-blue/0.1` + título + descrição. |
| `PageContainer` | `src/ui/site/page-container.tsx` | `narrow` (5xl) ou full (80rem). |
| `PageSection` | `src/ui/site/page-section.tsx` | `sm/md/lg/xl`, `borderTop`, `id`. |
| `SectionIntro` | `src/ui/site/section-intro.tsx` | `eyebrow/title/description`, `align left/center`. |
| `PublicHeader` / `PublicFooter` | `public-header/footer.tsx` | navegação oficial (7 links), CTAs `/piloto` + `/login`, toggle de tema; footer 3 colunas + barra legal. |
| `ScrollReveal` | `src/ui/site/scroll-reveal.tsx` | `delay` opcional. Motion oficial. |

`FeatureGrid`, `HeroSection`, `CTASection`, `FlowSection`, `ModuleGrid`
permanecem como composições disponíveis (não primitivos atômicos).

Exemplo:

```tsx
import { PageContainer, SectionIntro, SiteButton, SiteBadge, SiteCard } from '@/ui/site';

<PageContainer>
  <SectionIntro eyebrow="Como funciona" title="..." description="..." />
  <SiteCard variant="interactive">...</SiteCard>
  <SiteButton href="/piloto" variant="primary" testId="public-primary-cta">...</SiteButton>
  <SiteBadge variant="success">...</SiteBadge>
</PageContainer>
```

## 4. Regras de uso

- Cor: só `hsl(var(--ui-*))`; nunca hex literal nem `gray-*`/`white`/`black` chapados (gate `lint:design-system`).
- Acento: `accent-blue` para ação/ênfase; `success` para positivo/governança; `warning` para atenção; `danger` contido (dor/erro).
- Hierarquia: `label` → `heading-* extrabold tracking-tight text-ui-text` → `body-* text-ui-text-muted`.
- Superfícies: página `ui-page`; card `ui-surface`; interno `ui-surface-elevated`; neutro `ui-muted`. Bordas com alfa; `ring-4 ring-page` nos nós de thread.
- Responsivo mobile-first (`sm/md/lg`); CTAs `flex-col sm:flex-row w-full sm:w-auto`; header hamburger `<md`.
- Motion sempre com `reduced-motion`; autoplay com controle de pausa.
- Preservar `data-testid="public-hero-title"` e `"public-primary-cta"`.

## 5. Fora do Design System (composição de marketing)

`InteractiveHero` (simulador 4 estágios + dados demo fictícios),
`OperationalThread` (separadores vertical/branching), `FiveMomentsSection`,
`ContextBreakdownSection`, `ContinuousFlowTransformation`,
`ExpandedPlatformScopeSection`, `IntegrationsSection`,
`OperationEvolutionSection`, `HumanCentricSection`,
`BrandDifferentiationSection`, `BrazilOperationalRealismSection`,
`ICPSection`, chrome `#FF5F56/#FFBD2E/#27C93F`, demos do Frank, ordem
narrativa dos 14 blocos da Home. O DS fornece a linguagem; a narrativa fica
em cada página.

## 6. Decisões e conflitos resolvidos nesta issue

1. `ui-*` declarado fonte oficial; demais famílias classificadas como legado/suporte (sem nova camada paralela).
2. `--ui-warning` (+strong/ink) criado nos 4 escopos — 16 usos antes indefinidos agora resolvem.
3. `h-13` confirmado sem configuração customizada (Tailwind v3 não o gera); formalizado como `spacing.13 = 3.25rem`.
4. Radius reconciliado: público usa `2xl/xl/md` (1/0.75/0.5rem); `--radius-card 1.5rem` mantido só por compatibilidade e documentado como legado.
5. Tipografia: contrato oficial é a escala Tailwind da Home; `tokens.typography.css` classificado como legado de superfícies não-públicas.
6. `HeroSection` (pill `accent-blue`) vs `InteractiveHero` (retangular `ui-text`): ambos documentados; `SiteButton` oferece as duas receitas (`accent` vs `primary`) sem redesenhar a Home.
7. `HeroSection` referenciava `--ui-warning` inexistente — corrigido pelo item 2.

## 7. Prontidão para a próxima etapa

Páginas aptas a migrar (mesmo shell/ritmo, sem dependência de narrativa da Home):
`produto`, `como-funciona`, `ia-frank`, `seguranca`, `piloto`, `faq`, `proof`
(conteúdo migra como seções com `PageContainer/SectionIntro/SiteCard/SiteButton`).
Fora da próxima leva: `/planos/domine`, `/concept-layer*` (frozen),
rotas candidatas a remoção em `docs/public-site-architecture.md`
(`plataforma`, `tecnologias`, `solucoes`, `implantacao`, `integracoes`,
`showcase`, `valores`), e `cotacao` (removida do MVP na #396).
