import Link from 'next/link';

/**
 * Landing section — /mvp public entry point.
 * Editorial, high-density design aligned with the operational aesthetics.
 * No generic gradient. Sober, trustworthy, operationally focused.
 */
export function LandingSection() {
  return (
    <div className="max-w-3xl mx-auto space-y-20">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-8 pb-4 space-y-8">
        <div className="space-y-2">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em] inline-block"
            style={{ color: 'hsl(var(--mvp-accent))' }}
          >
            CONDSTORE OS · MVP SUPERVISIONADO
          </p>
          <h1
            className="text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-[-0.02em]"
            style={{ color: 'hsl(var(--mvp-text-1))' }}
          >
            Frete, pedidos e WhatsApp — um fluxo único, supervisionado.
          </h1>
          <p
            className="text-base max-w-xl leading-relaxed mt-4"
            style={{ color: 'hsl(var(--mvp-text-2))' }}
          >
            Cada conversa vira cotação. Cada cotação passa por aprovação humana. Cada pedido
            aprovado é rastreável do início ao fim.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center h-11 px-6 rounded-[var(--mvp-radius-sm)] text-sm font-medium transition-all duration-150"
            style={{
              background: 'hsl(var(--mvp-accent))',
              color: 'white',
            }}
          >
            Entrar na plataforma →
          </Link>
          <Link
            href="/mvp/como-funciona"
            className="inline-flex items-center justify-center h-11 px-6 rounded-[var(--mvp-radius-sm)] text-sm font-medium border transition-all duration-150"
            style={{
              border: '1px solid hsl(var(--mvp-border-strong))',
              color: 'hsl(var(--mvp-text-2))',
              background: 'transparent',
            }}
          >
            Ver como funciona
          </Link>
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ borderTop: '1px solid hsl(var(--mvp-border))' }} />

      {/* ── Pilares ──────────────────────────────────────────────── */}
      <section aria-label="Pilares do produto" className="space-y-4">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'hsl(var(--mvp-text-3))' }}
        >
          O que está no MVP
        </p>
        <div className="grid gap-px sm:grid-cols-3" style={{ background: 'hsl(var(--mvp-border))' }}>
          {PILLARS.map((pillar) => (
            <article
              key={pillar.title}
              className="p-5 space-y-3"
              style={{ background: 'hsl(var(--mvp-surface-1))' }}
            >
              <div
                className="w-8 h-8 rounded-[var(--mvp-radius-xs)] flex items-center justify-center text-sm"
                style={{
                  background: 'hsl(var(--mvp-accent-bg))',
                  color: 'hsl(var(--mvp-accent))',
                }}
                aria-hidden="true"
              >
                {pillar.icon}
              </div>
              <div className="space-y-1">
                <h2
                  className="text-sm font-semibold"
                  style={{ color: 'hsl(var(--mvp-text-1))' }}
                >
                  {pillar.title}
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'hsl(var(--mvp-text-3))' }}
                >
                  {pillar.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Guarantee block ──────────────────────────────────────── */}
      <section
        className="p-6 rounded-[var(--mvp-radius-md)]"
        style={{
          background: 'hsl(var(--mvp-surface-1))',
          border: '1px solid hsl(var(--mvp-border))',
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div
            className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: 'hsl(var(--mvp-accent-bg))', color: 'hsl(var(--mvp-accent))' }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 1l1.5 4.5H15l-3.5 2.5L13 13l-4-2.5L5 13l1.5-5L3 5.5h4.5L9 1z" />
            </svg>
          </div>
          <div className="flex-1 space-y-1">
            <h2
              className="text-sm font-semibold"
              style={{ color: 'hsl(var(--mvp-text-1))' }}
            >
              Gate de aprovação obrigatório
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'hsl(var(--mvp-text-3))' }}
            >
              Nenhum pedido avança sem aprovação operacional registrada. O sistema nunca fecha
              ordem de forma autônoma.
            </p>
          </div>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center h-9 px-5 rounded-[var(--mvp-radius-sm)] text-sm font-medium shrink-0 transition-all duration-150"
            style={{
              background: 'hsl(var(--mvp-surface-3))',
              color: 'hsl(var(--mvp-text-1))',
              border: '1px solid hsl(var(--mvp-border-strong))',
            }}
          >
            Acessar
          </Link>
        </div>
      </section>
    </div>
  );
}

const PILLARS = [
  {
    icon: '✓',
    title: 'Fluxo supervisionado',
    description:
      'Operador humano no centro da decisão. Toda proposta revisada antes de virar pedido.',
  },
  {
    icon: '↗',
    title: 'WhatsApp + Cockpit',
    description:
      'Atendimento, cotações e confirmações no canal do cliente. Cockpit com visibilidade completa.',
  },
  {
    icon: '⟳',
    title: 'Ciclo completo',
    description:
      'De cotação a entrega: rastreio ativo, status em tempo real, SLA e exceções visíveis.',
  },
] as const;
