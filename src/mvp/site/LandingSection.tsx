import Link from 'next/link';

/**
 * Public landing section rendered at /mvp when the visitor is unauthenticated.
 * Presents the core value proposition and CTAs.
 * Self-contained — no dependency on the main app UI components.
 */
export function LandingSection() {
  return (
    <div className="max-w-3xl mx-auto space-y-16">
      {/* Hero */}
      <section className="text-center space-y-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          CONDSTORE OS · MVP SUPERVISIONADO
        </p>
        <h1 className="text-4xl font-bold text-foreground leading-tight">
          Frete, pedidos e WhatsApp num fluxo único supervisionado.
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Cada conversa vira cotação. Cada cotação passa por aprovação. Cada
          pedido aprovado é rastreável do início ao fim.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Entrar na plataforma
          </Link>
          <Link
            href="/mvp/como-funciona"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background text-foreground px-6 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Como funciona
          </Link>
        </div>
      </section>

      {/* Value pillars */}
      <section aria-label="Pilares do produto">
        <div className="grid gap-4 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-xl border border-border bg-card p-5 space-y-2"
            >
              <span className="text-xl" aria-hidden="true">
                {pillar.icon}
              </span>
              <h2 className="text-sm font-semibold text-foreground">
                {pillar.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {pillar.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="rounded-xl border border-border bg-muted/30 p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Pronto para operar?
        </h2>
        <p className="text-sm text-muted-foreground">
          Acesse a plataforma com suas credenciais ou fale com o time para
          ativar seu tenant piloto.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Acessar plataforma
          </Link>
          <Link
            href="/mvp/como-funciona"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background text-foreground px-5 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Ver o fluxo completo
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
      'Operador humano no centro da decisão. Toda proposta de frete é revisada antes de virar pedido.',
  },
  {
    icon: '💬',
    title: 'WhatsApp integrado',
    description:
      'Atendimento, cotações e confirmações diretamente no canal do cliente, sem troca de ferramenta.',
  },
  {
    icon: '📊',
    title: 'Cockpit operacional',
    description:
      'Visibilidade completa de fila, status, SLA e rastreio em tempo real para toda a equipe.',
  },
] as const;
