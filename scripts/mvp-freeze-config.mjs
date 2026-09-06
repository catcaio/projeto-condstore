export const guardrailAllowlist = new Set([
  'AGENTS.md',
  'docs/mvp-freeze-plan.md',
  'docs/pr-test-scope.md',
  'package.json',
  'scripts/mvp-freeze-config.mjs',
  'scripts/pr-test-scope.mjs',
  'scripts/verify-mvp-freeze.mjs',
  'src/modules/cockpit/rooms/rooms.registry.ts',
  'src/modules/cockpit/rooms/subrooms.registry.ts',
]);

/**
 * MVP Baseline surfaces (conceito vigente desde a conversão Freeze → Baseline).
 *
 * Mesmos prefixos do antigo hard freeze, porém com semântica diferente:
 * toques aqui são MUDANÇAS INTENCIONAIS PERMITIDAS — o guardrail apenas as
 * REPORTA em voz alta (advisory) para detectar regressão acidental e quebra
 * de contrato. Desenvolvimento normal NÃO é bloqueado.
 *
 * O bloqueio obrigatório vive em `securityInvariantGates` abaixo e NUNCA foi
 * afrouxado pela conversão.
 */
export const baselineSurfaces = [
  {
    label: 'Frank runtime, training e consoles',
    prefixes: [
      'src/app/(app)/frank/',
      'src/app/(app)/cockpit/frank/',
      'src/app/api/cockpit/frank/intents/',
      'src/app/api/cockpit/frank/knowledge/',
      'src/app/api/cockpit/frank/playbooks/',
      'src/app/api/cockpit/metrics/frank/',
      'src/app/api/internal/frank/',
      'src/modules/frank/intents/',
      'src/modules/frank/knowledge/',
      'src/modules/frank/playbooks/',
      'src/modules/frank/workers/',
      'src/modules/frank/ui/global-assistant/',
    ],
  },
  {
    label: 'Knowledge / RAG authoring',
    prefixes: [
      'src/modules/knowledge/',
      'src/app/api/knowledge/',
      'src/app/(app)/cockpit/knowledge/',
    ],
  },
  {
    label: 'Playbooks autorais',
    prefixes: [
      'src/modules/playbooks/',
      'src/app/(admin)/cockpit/playbooks/',
      'src/app/api/cockpit/playbooks/',
    ],
  },
  {
    label: 'DOMINE console e control plane visual',
    prefixes: [
      'src/app/(app)/cockpit/domine/',
      'src/app/api/cockpit/domine/',
      'src/app/(app)/operacao/',
      'src/app/(app)/sistema/dlq/',
    ],
  },
  {
    label: 'Superfícies experimentais / narrativas fora do MVP',
    prefixes: [
      'src/app/evolution/',
      'src/app/(app)/supreme/',
      'src/app/(app)/cockpit/deliveries/',
      'src/app/(app)/cockpit/freight-insights/',
      'src/app/(app)/cockpit/freight-memory/',
      'src/app/(app)/cockpit/freight-simulator/',
    ],
  },
];

/**
 * Alias de compatibilidade: aponta para `baselineSurfaces`. Mantido porque
 * `verify-mvp-freeze.mjs` e docs legadas importam este nome. A semântica de
 * BLOQUEIO foi removida no script do guardrail — este export hoje serve só
 * para detecção/classificação, nunca para vetar.
 */
export const hardFrozenSurfaces = baselineSurfaces;

/**
 * Security invariants: gates OBRIGATÓRIOS e BLOQUEANTES executados pelo
 * guardrail do MVP Baseline. A conversão Freeze → Baseline NÃO afrouxou
 * nenhum deles. Falha em qualquer um = exit 1 (fail closed, inclusive se o
 * próprio gate quebrar ao executar).
 */
export const securityInvariantGates = [
  { label: 'tenant isolation (AST)', command: 'verify:tenant-isolation' },
  { label: 'route security guards', command: 'routes:verify-security' },
];

export const freightConversationQuotePrefixes = [
  'src/app/api/cockpit/conversations/[id]/quotes/',
];

export const frankCompatibilitySeamPrefixes = [
  'src/modules/frank/entity-resolver.ts',
  'src/modules/frank/intent-resolver.ts',
  'src/modules/frank/session.repository.ts',
  'src/modules/frank/conversation-control.ts',
  'src/modules/frank/auto-response-guard.ts',
  'src/modules/frank/suggestions/',
];

export const scopeRules = [
  {
    label: 'Tooling e governança',
    prefixes: ['scripts/', 'package.json', 'package-lock.json', 'vitest.config.mjs', 'vitest.config.ts', 'tsconfig.json', 'tsconfig.build.json', 'eslint.config.cjs'],
    commands: ['npm run guardrail:mvp-freeze', 'npm run scope:pr-tests', 'npm run lint', 'npm run typecheck'],
  },
  {
    label: 'WhatsApp supervisionado',
    coreArea: 'whatsapp',
    prefixes: [
      'src/modules/atendimento/',
      'src/app/api/whatsapp/',
      'src/server/twilio/',
      'src/app/(app)/cockpit/atendimento/',
      'src/app/api/cockpit/conversations/',
    ],
    excludePrefixes: freightConversationQuotePrefixes,
    commands: ['npm run guardrail:mvp-freeze', 'npm run test:whatsapp', 'npm run lint', 'npm run typecheck'],
  },
  {
    label: 'Cockpit operacional',
    coreArea: 'cockpit',
    prefixes: [
      'src/modules/cockpit/',
      'src/app/(app)/cockpit/',
      'src/app/api/cockpit/metrics/',
      'src/app/api/cockpit/ops/',
      'src/app/api/cockpit/timeline/',
      'src/app/api/cockpit/custom-fields/',
    ],
    commands: ['npm run guardrail:mvp-freeze', 'npm run test:cockpit', 'npm run lint', 'npm run typecheck'],
  },
  {
    label: 'Frete, pedidos e shipments',
    coreArea: 'freight',
    prefixes: [
      'src/modules/freight/',
      'src/modules/logistics/',
      'src/modules/logistica/',
      'src/modules/pedidos/',
      'src/modules/shipping/',
      'src/app/api/public/cotacao/',
      'src/app/api/orders/',
      ...freightConversationQuotePrefixes,
    ],
    commands: ['npm run guardrail:mvp-freeze', 'npm run test:freight', 'npm run lint', 'npm run typecheck'],
  },
];

export const supportSeamEscalations = [
  {
    label: 'DOMINE e barramento de eventos usados pelo core',
    prefixes: [
      'src/domine/',
      'src/modules/domine/',
      'src/lib/events/',
      'src/app/api/domine/intake/',
      'src/app/api/internal/jobs/domine-process/',
    ],
    commands: ['npm run test:mvp'],
  },
  {
    label: 'Costuras supervisionadas do Frank usadas pelo core',
    prefixes: frankCompatibilitySeamPrefixes,
    commands: ['npm run test:mvp'],
  },
  {
    label: 'Repositórios shared cruzando áreas core',
    prefixes: ['src/infra/repositories/'],
    commands: ['npm run test:mvp'],
    minCoreAreas: 2,
  },
];

export const routeSecurityPrefixes = [
  'src/app/api/',
  'src/middleware.ts',
  'src/infra/auth/',
  'src/infra/security/',
];

export const routeSyncPrefixes = [
  'src/app/api/',
  'src/app/(app)/',
  'src/app/(public)/',
  'src/app/(auth)/',
  'src/app/billing/',
  'src/app/pricing/',
  'src/app/t/',
];

export const routeSyncSuffixes = [
  '/page.tsx',
  '/route.ts',
  '/layout.tsx',
  '/loading.tsx',
  '/error.tsx',
  '/not-found.tsx',
];

export const dbPrefixes = [
  'src/drizzle/',
  'drizzle/',
  'src/infra/repositories/',
  'db_check.ts',
];

export const publicGuardrailPrefixes = [
  'src/app/api/public/',
  'src/app/t/',
  'src/infra/attribution/',
  'src/modules/funnel/',
  'src/modules/metrics/',
];

export const broadCoveragePrefixes = [
  'src/middleware.ts',
  'src/infra/auth/',
  'src/infra/security/',
  'src/lib/',
  'src/core/',
  'vitest.config.mjs',
  'vitest.config.ts',
  'next.config.mjs',
];

export const buildPrefixes = [
  'src/app/layout.tsx',
  'src/ui/shell/',
  'src/providers/',
  'next.config.mjs',
];
