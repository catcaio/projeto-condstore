# MVP Setup

Guia para rodar, testar e ativar/desativar o ambiente isolado de MVP dentro do
repositório CONDSTORE OS.

---

## O que é o MVP isolado

O diretório `src/mvp/` contém a camada de apresentação e lógica auxiliar do
MVP — completamente desacoplada do sistema principal. Ele expõe rotas sob `/mvp`
via Next.js App Router, com layout próprio e sem dependência do shell da
aplicação principal.

```
src/mvp/
├── config/         # Feature flags (NEXT_PUBLIC_ENABLE_MVP)
├── lib/            # Helpers isolados (auth mínima)
│   └── __tests__/  # Testes unitários do MVP
├── site/           # Componentes das páginas públicas
├── app/            # Componentes do fluxo autenticado mínimo
└── components/     # Componentes compartilhados dentro do MVP

src/app/mvp/              # Rotas Next.js (App Router)
├── layout.tsx            # Layout isolado com MvpShell
├── page.tsx              # /mvp — landing pública
├── como-funciona/
│   └── page.tsx          # /mvp/como-funciona — fluxo supervisionado
└── app/
    └── page.tsx          # /mvp/app — área autenticada (CockpitMini)
```

---

## Páginas disponíveis

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/mvp` | Pública | Landing com proposta de valor e CTAs |
| `/mvp/como-funciona` | Pública | Fluxo de 4 etapas do MVP supervisionado |
| `/mvp/app` | **Autenticada** | CockpitMini — acesso aos módulos operacionais |

A rota `/mvp/app` exige sessão válida. Visitantes não autenticados são
redirecionados para `/auth/login` pelo Edge middleware.

---

## Como ativar o MVP

Defina a variável de ambiente antes de iniciar o servidor:

```bash
NEXT_PUBLIC_ENABLE_MVP=true npm run dev
```

Ou adicione ao seu `.env.local`:

```env
NEXT_PUBLIC_ENABLE_MVP=true
```

Com a flag ativa, acesse:

```
http://localhost:3000/mvp
http://localhost:3000/mvp/como-funciona
http://localhost:3000/mvp/app       (requer login)
```

Com a flag inativa (padrão), todas as rotas `/mvp/*` retornam **404** — sem
impacto em qualquer outra rota do sistema.

---

## Como desativar o MVP

Remova a variável ou defina-a como `false`:

```env
NEXT_PUBLIC_ENABLE_MVP=false
```

O build de produção também respeita a flag.

---

## Como rodar o MVP em desenvolvimento

```bash
# Iniciar servidor com MVP ativo
NEXT_PUBLIC_ENABLE_MVP=true npm run dev

# Acessar landing pública
open http://localhost:3000/mvp

# Acessar "como funciona"
open http://localhost:3000/mvp/como-funciona

# Acessar área autenticada (requer login prévio)
open http://localhost:3000/mvp/app
```

---

## Como testar o MVP

### Testes unitários isolados

Roda apenas os testes dentro de `src/mvp/`:

```bash
npm run test:mvp
```

Esses testes cobrem: feature flags, auth helpers e comportamento do middleware
para as rotas `/mvp/app/*`.

### Typecheck isolado

Verifica apenas os arquivos `src/mvp/**` e `src/app/mvp/**`:

```bash
npm run typecheck:mvp
```

### Suite completa do sistema

```bash
npm run test:ci
```

---

## Impacto no sistema principal

| Aspecto              | Impacto |
|----------------------|---------|
| Rotas existentes     | Nenhum — rotas `/mvp/*` são novas e isoladas |
| Middleware de auth   | Mínimo — `/mvp/app/:path*` adicionado ao matcher; `/mvp` e `/mvp/como-funciona` permanecem fora |
| Build de produção    | Nenhum — MVP desativado por padrão (`404`) |
| Testes existentes    | Nenhum — `test:mvp` roda apenas `src/mvp/` |
| Typecheck principal  | Nenhum — `tsconfig.mvp.json` é separado |

---

## Arquivos relevantes

| Arquivo | Descrição |
|---------|-----------|
| `src/mvp/config/flags.ts` | Feature flags do MVP |
| `src/mvp/lib/auth.ts` | Auth helper mínimo (lê headers do middleware) |
| `src/mvp/components/MvpShell.tsx` | Layout shell com navegação MVP |
| `src/mvp/site/LandingSection.tsx` | Landing pública com proposta de valor |
| `src/mvp/site/ComoFuncionaSection.tsx` | Seção "Como funciona" (4 etapas) |
| `src/mvp/app/CockpitMini.tsx` | Cockpit mínimo para usuário autenticado |
| `src/app/mvp/layout.tsx` | Layout da rota `/mvp` |
| `src/app/mvp/page.tsx` | Página `/mvp` |
| `src/app/mvp/como-funciona/page.tsx` | Página `/mvp/como-funciona` |
| `src/app/mvp/app/page.tsx` | Página `/mvp/app` (autenticada) |
| `src/mvp/lib/__tests__/mvp-app-middleware.test.ts` | Testes do middleware para `/mvp/app` |
| `tsconfig.mvp.json` | TypeScript config isolado para MVP |
