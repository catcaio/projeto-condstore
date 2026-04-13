# MVP Setup

Guia para rodar, testar e ativar/desativar o ambiente isolado de MVP dentro do
repositório CONDSTORE OS.

---

## O que é o MVP isolado

O diretório `src/mvp/` contém a camada de apresentação e lógica auxiliar do
MVP — completamente desacoplada do sistema principal. Ele expõe a rota `/mvp`
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

src/app/mvp/        # Rota Next.js (App Router)
├── layout.tsx      # Layout isolado com MvpShell
└── page.tsx        # Entrypoint da rota /mvp
```

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
```

Com a flag inativa (padrão), a rota `/mvp` retorna **404** — sem impacto em
qualquer outra rota do sistema.

---

## Como desativar o MVP

Remova a variável ou defina-a como `false`:

```env
NEXT_PUBLIC_ENABLE_MVP=false
```

O build de produção também respeita a flag. Se não estiver definida ou for
`false`, a rota não é acessível.

---

## Como rodar o MVP em desenvolvimento

```bash
# Iniciar servidor com MVP ativo
NEXT_PUBLIC_ENABLE_MVP=true npm run dev

# Acessar
open http://localhost:3000/mvp
```

---

## Como testar o MVP

### Testes unitários isolados

Roda apenas os testes dentro de `src/mvp/`:

```bash
npm run test:mvp
```

Esses testes são rápidos e cobrem a lógica central do MVP (feature flags, auth
helpers).

### Typecheck isolado

Verifica apenas os arquivos `src/mvp/**` e `src/app/mvp/**`:

```bash
npm run typecheck:mvp
```

### Suite completa do sistema

Os testes do MVP também são incluídos na suite completa de CI:

```bash
npm run test:ci
```

---

## Impacto no sistema principal

| Aspecto              | Impacto |
|----------------------|---------|
| Rotas existentes     | Nenhum — `/mvp` é uma rota nova e isolada |
| Middleware de auth   | Nenhum — `/mvp` está fora do matcher |
| Build de produção    | Nenhum — MVP desativado por padrão (`404`) |
| Testes existentes    | Nenhum — `test:mvp` roda apenas `src/mvp/` |
| Typecheck principal  | Nenhum — `tsconfig.mvp.json` é separado |

---

## Arquivos relevantes

| Arquivo | Descrição |
|---------|-----------|
| `src/mvp/config/flags.ts` | Feature flags do MVP |
| `src/mvp/lib/auth.ts` | Auth helper mínimo |
| `src/mvp/components/MvpShell.tsx` | Layout shell do MVP |
| `src/mvp/site/LandingSection.tsx` | Seção pública de landing |
| `src/mvp/app/CockpitMini.tsx` | Cockpit mínimo autenticado |
| `src/app/mvp/layout.tsx` | Layout da rota `/mvp` |
| `src/app/mvp/page.tsx` | Página da rota `/mvp` |
| `tsconfig.mvp.json` | TypeScript config isolado para MVP |
