/**
 * Public landing section rendered at /mvp when the visitor is unauthenticated.
 * Presents the core value proposition and a CTA to the main auth flow.
 */
export function LandingSection() {
  return (
    <section className="max-w-2xl mx-auto text-center py-16 space-y-6">
      <h1 className="text-3xl font-bold text-foreground leading-tight">
        Automatize o frete da sua loja
      </h1>
      <p className="text-muted-foreground text-lg">
        Cotações inteligentes, múltiplas transportadoras e automação via WhatsApp
        em minutos.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Entrar na plataforma
        </a>
        <a
          href="/como-funciona"
          className="inline-flex items-center justify-center rounded-md border border-border bg-background text-foreground px-6 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          Como funciona
        </a>
      </div>
    </section>
  );
}
