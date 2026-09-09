# FRK-8 — Frank Intelligence (camada contextual sobre o Cockpit)

Dependência: FRK-9 (execution state machine). Critério: sugestões
explicáveis, persistidas e rastreáveis, com o operador como único autorizador
de execução.

## 1. O que é (e o que NÃO é)

Frank/008 é uma **camada** transversal de inteligência — não uma sala, chat
ou módulo isolado. Ela produz **recomendações** (`FrankSuggestion`) nas três
superfícies do Cockpit: fila (`queue`), contexto ativo (`active_context`) e
pulso (`pulse`).

Fronteira de responsabilidade (não negociável):

| Responsabilidade | Dono |
|---|---|
| Produzir recomendação | `frank-intelligence` (avaliadores) |
| Explicar a recomendação | `reason` obrigatório em toda sugestão |
| Filtrar por preferências do tenant | `FrankTenantPreferences` (tipos desativados + cutoff de confiança) |
| Persistir sugestão e feedback | `IntelligenceStore` (InMemory / Drizzle) |
| Executar a ação | **NUNCA o Frank** — apenas o operador, via o boundary de execução FRK-9 (`execution-runtime`) |

Regra: **Frank recomenda, operador decide.** Gerar uma sugestão jamais chama
um endpoint de ação; `type: 'automation'` significa "recomendo automatizar",
não "execute agora".

## 2. Estrutura

```
src/modules/frank/
  execution/                         # FRK-9 (state machine Run/Step) — intacto
  intelligence/
    frank-intelligence.types.ts      # FrankSuggestion, feedback, preferências, validações
    frank-intelligence.evaluators.ts # avaliadores determinísticos (queue/context/pulse) — sem LLM
    frank-intelligence.service.ts    # orquestra avaliadores + filtro + persistência
    frank-intelligence.repository.ts # IntelligenceStore: InMemory + Drizzle/MySQL
    frank-intelligence.preferences.ts# preferências por tenant: InMemory + Drizzle
    scoring/thread-priority-score.ts # score determinístico explicável (0..100)
    __tests__/frank-intelligence.test.ts
src/app/api/frank/
  suggestions/route.ts   # GET ?surface=queue|active_context|pulse
  feedback/route.ts      # POST { suggestionId, outcome }
  preferences/route.ts   # GET / PUT { disabledTypes?, minConfidence? }
src/drizzle/migrations/0006_frank_intelligence.sql
```

## 3. Contrato

```ts
interface FrankSuggestion {
  id: string;
  tenantId: string;
  surface: 'queue' | 'active_context' | 'pulse';
  type: 'action' | 'info' | 'automation';
  title: string;
  description: string;
  reason: string;        // obrigatório (explicabilidade)
  confidence: number;    // 0..1; cutoff padrão 0.75
  action?: { label; endpoint; method: 'GET'|'POST'|'PUT'|'DELETE'; payload? };
  createdAt: string;
  expiresAt?: string | null;
}
```

Feedback: `POST /api/frank/feedback` com `outcome: accepted|rejected|dismissed|expired`,
sempre tenant-scoped (o `tenantId` vem do middleware JWT, nunca do body).

## 4. Persistência

- `frank_suggestions`: sugestão persistida (rastreável, auditável),
  tenant-scoped, `UNIQUE(id)`.
- `frank_feedbacks`: laço de decisão do operador; referência a sugestão
  existente; `accepted`/`rejected` alimentam a taxa de aceitação.
- `frank_preferences`: configurações do operador por tenant.

Garantia de isolamento: **toda** leitura/escrita carrega `tenantId` como chave
de entrada (`getSuggestion({ tenantId, suggestionId })` — nunca `getSuggestion(id)`).
Acesso cross-tenant falha fechado com `TenantMismatchError`.

## 5. Escopo desta PR (limites declarados)

- **Sem LLM** (decisão de arquitetura): avaliadores 100% determinísticos e
  explicáveis. Enriquecimento probabilístico (resumos, classificação suave) é
  etapa posterior, assíncrona e cacheável — fora desta PR.
- As superfícies do Cockpit (`/api/cockpit/queue`, `/active-context`, `/pulse`)
  ainda não existem como rotas; o contrato `GET /api/frank/suggestions?surface=…`
  é o ponto de integração preparado para elas. A rota roda com sinais vazios e
  o pipeline é validado pelos testes (unitários + Drizzle real).
- `execution` (FRK-9) continua sendo a única autoridade de execução; esta PR
  não cria executor paralelo.

## 6. Validação

- `tsc -p tsconfig.build.json --noEmit` → 0 erros.
- `vitest` com include scoped do módulo → suite unitária + suite Drizzle
  (a Drizzle roda quando `TEST_DATABASE_URL` está definida; caso contrário
  pula de forma audível).
- Migration `0006_frank_intelligence.sql` aplicada e testada em MySQL 8 local
  (container `frank-mysql-test`, porta 3307).

## 7. Decisão de arquitetura (proveniência)

Resultado de consulta de arquitetura via ChatGPT (projeto "Hermes" na conta
condstore): "primeiro PR deliberadamente sem LLM — scoring + regras de exceção
+ sugestões explicáveis + persistência + feedback. Isso testa a arquitetura
real antes do componente probabilístico". Esta PR implementa exatamente essa
etapa.