# Brand Identity (CONDSTORE OS)

## Assets e Símbolos
Os assets oficiais da marca CONDSTORE OS estão padronizados como SVG vetorizados para garantir alta performance e Zero CLS. Encontram-se no diretório `/public/brand/`:

- `condstoreos-mark.svg`: Símbolo isolado (ícone minimalista "C" isométrico).
- `condstoreos-logo-lockup.svg`: Marca completa (Símbolo + CONDSTORE OS + tagline "UM COMPLEXO SEM COMPLEXIDADE.").
- `/public/favicon.svg`: Arquivo otimizado como ícone do site, referenciado via `metadata` global do App Router e `site.webmanifest`.

## Tokens Oficiais
As cores essenciais da CONDSTORE OS estão declaradas no `:root` em `src/app/globals.css`:
- `--condstore-blue-900`: `#0E2433` (Night Blue - Primário Dark)
- `--condstore-blue-700`: `#1C4E6E` (Deep Blue)
- `--condstore-blue-500`: `#3B88A8` (Brand Blue - Ações / Hover)
- `--condstore-blue-300`: `#5DAAC6` (Sky Blue - Acentos)
- `--condstore-gray-100`: `#F5F7F9` (Background Default Público)

> **Importante:** Nunca utilize cores hardcoded em CSS Modules ou Style tags inline, evite `bg-white` puro para backgrounds extensos; utilize os tokens semânticos do Tailwind que derivam desta paleta.

## BrandHeader
`src/ui/components/brand/BrandHeader.tsx` é o componente oficial responsável pela identidade da CONDSTORE no cabeçalho das páginas públicas (marketing, cotação). 

### UX e Comportamentos:
- **Responsive Adaptive:** No Mobile utiliza a Mark acompanhada pela grafia em texto HTML; no Desktop apresenta a Lockup em SVG pleno (altura 40px), ocultando o Tagline com naturalidade no downgrade de viewport.
- **Glassmorphism Baseado em iOS:** Posicionamento em `<header className="sticky top-0 z-50">` atrelado a `backdrop-blur-md bg-white/80` para rolagem content flush agradável subjacente à interface.
- **Zero CLS:** O Componente Next `<Image />` tem `width` e `height` rigorosamente fornecidos nos dois breakpoints controlados.

## Manutenção
Sempre que a marca for atualizada no futuro:
1. Trabalhe em arquivos vetoriais.
2. Não rasterize, evite converters baseados em pixels (exporte o SVG cru, preferencialmente validado pelo SVGO).
3. Não use distorções ou recolorização (como `filter` CSS descontrolados) sobre a lockup principal.
