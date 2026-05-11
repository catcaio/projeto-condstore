# Arquitetura Frontend — CONDSTORE OS

Este documento formaliza as decisões arquiteturais da camada de frontend do CONDSTORE OS para o MVP e além. O objetivo é garantir estabilidade, segurança (tenant isolation) e consistência na entrega, evitando refatorações massivas desnecessárias.

## 1. Route Groups & Estrutura de Diretórios (`src/app`)

O App Router é organizado em Route Groups (`(...)`) para separar escopos de layout e autenticação sem afetar a URL:

*   **Públicas/Marketing (Root)**: `/`, `/sobre`, `/pricing`. Não requerem sessão. Foco em SEO e performance (estáticas sempre que possível).
*   **Auth (`/login`, `/signup`)**: Rotas isoladas para o fluxo de autenticação. Devem redirecionar para `/cockpit` se uma sessão ativa já existir.
*   **`/(app)`**: O Route Group principal logado. Contém o `AppShell` e o `SessionProvider`. Tudo dentro deste escopo exige autenticação e um `tenantId` válido.
    *   `/cockpit`: O painel principal operacional.
    *   `/tenant`: Configurações a nível de organização.
    *   `/admin/platform`: Ferramentas internas (Supreme, acesso restrito).
*   **APIs Críticas (`/api`)**: Separadas entre públicas (`/api/public/*`), internas do sistema (`/api/internal/*`), e específicas do tenant (`/api/tenants/[tenantId]/*`). Todas as rotas de tenant são protegidas por middlewares rigorosos.

## 2. Composição de Páginas e Componentes

*   **Padrão de UI**: Baseado no ecossistema Radix/Tailwind (Shadcn UI).
*   **Layouts**: O layout root provê fontes e estilos globais. O layout em `/(app)/layout.tsx` injeta a casca do painel (`AppShell`) e valida a sessão.
*   **Composição Modular**: Telas complexas (ex: Cockpit) devem ser quebradas em componentes de domínio (ex: `InboxList`, `FreightSimulator`), injetados na página principal como Server Components ou chamando Client Components conforme a necessidade de interatividade.

## 3. Server Components vs Client Components

*   **Server Components (Default)**: Use o padrão para buscar dados do banco diretamente (via Drizzle/Repositories) e compor a estrutura da página. Maximize o uso para garantir SEO (nas públicas) e performance/segurança no painel.
*   **Client Components (`"use client"`)**: Restritos **exclusivamente** às "folhas" da árvore de renderização que necessitam de interatividade (estado local, `useState`, `onClick`, modais, hooks customizados como `useForm` ou SWR).
*   **Regra de Ouro**: Nunca coloque `"use client"` no topo de uma página (`page.tsx`) inteira, a menos que seja um formulário simples isolado. Isole a interatividade em sub-componentes.

## 4. Guards & Redirects

*   **Middleware (`middleware.ts`)**: Atua como a primeira linha de defesa, garantindo que rotas protegidas (como `/cockpit`) não sejam acessadas sem token JWT válido.
*   **Session Guards**: O layout `/(app)/layout.tsx` atua como guardião secundário, extraindo o Tenant e User da sessão para injetar via Context API, ou redirecionando para `/login` caso expirado.
*   **Redirects Inconsistentes**: Evitados mantendo uma única fonte de verdade. O sucesso do login redireciona **apenas** para `/cockpit`. Qualquer desvio (ex: onboarding pendente) é tratado por componentes de estado na raiz do app.

## 5. State Management por Domínio

O CONDSTORE OS evita estados globais massivos (como Redux). A arquitetura atual se baseia em:

*   **Sessão e Tenant**: Mantidos globais via `SessionProvider` (React Context) no nível de `/(app)`.
*   **Server State (Cache/Busca)**: Delegado ao React Server Components (para leitura inicial) e bibliotecas de data-fetching (como `SWR` ou `TanStack Query`) no lado cliente para requisições vitais.
*   **Local State**: Gerenciado internamente nos componentes via `useState`/`useReducer`.
*   A comunicação inter-domínio deve ocorrer através de URLs, Query Params ou mutações de banco/API refletidas via revalidação de dados, não por event buses no lado cliente.

## 6. Loading, Error & Empty States

Toda rota crítica deve implementar o contrato mínimo de UX:
*   **`loading.tsx`**: Skeletons ou spinners enquanto o Server Component resolve. Nunca exibir uma tela "branca" de espera.
*   **`error.tsx`**: Fallbacks resilientes com opção de "Tentar Novamente", ocultando stack traces do usuário final.
*   **Empty States**: Se não há dados (ex: sem pedidos na fila), exibir uma ilustração limpa com um CTA primário sugerindo o próximo passo (ex: "Criar novo pedido").

## 7. Limites para P1/P2/P3

*   **P1 (Pilot Lock)**: Foco exclusivo na estabilidade das rotas `/cockpit` e fluxos de frete/atendimento. Alterações estruturais no `SessionProvider` ou `AppShell` estão congeladas.
*   **P2**: Otimização de Web Vitals, introdução de streaming de UI avançado (React Suspense Boundaries granulares) no cockpit.
*   **P3**: Internacionalização (i18n), Temas (Dark/Light persistente customizável), e extensões do App Router avançadas (Parallel/Intercepting Routes).
