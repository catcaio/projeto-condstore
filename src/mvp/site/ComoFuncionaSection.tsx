import Link from 'next/link';

/**
 * "Como funciona" content section rendered at /mvp/como-funciona.
 * Explains the 4-step supervised flow.
 * Self-contained — no dependency on the main app UI components.
 */
export function ComoFuncionaSection() {
  return (
    <div className="max-w-3xl mx-auto space-y-14">
      {/* Header */}
      <section className="text-center space-y-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Como funciona
        </p>
        <h1 className="text-3xl font-bold text-foreground leading-tight">
          Do pedido à entrega, sem ponto cego.
        </h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto">
          O CONDSTORE OS conecta atendimento, cotação, aprovação e logística num
          fluxo único. Cada etapa tem responsável, horário e estado registrado.
        </p>
      </section>

      {/* Steps */}
      <section aria-label="Etapas do fluxo">
        <ol className="space-y-6">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="flex gap-5 rounded-xl border border-border bg-card p-6"
            >
              <span
                className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center"
                aria-hidden="true"
              >
                {step.number}
              </span>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">
                  {step.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Gate callout */}
      <section
        className="rounded-xl border border-border bg-muted/30 p-6 space-y-2"
        aria-label="Gate de aprovação"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Gate obrigatório
        </p>
        <p className="text-sm text-foreground font-medium">
          Nenhum pedido avança sem aprovação operacional registrada.
        </p>
        <p className="text-sm text-muted-foreground">
          O operador revisa a cotação, confirma as condições comerciais e
          autoriza a execução. O sistema nunca fecha pedido de forma autônoma.
        </p>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 pb-8">
        <h2 className="text-base font-semibold text-foreground">
          Pronto para operar no fluxo supervisionado?
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Acessar plataforma
          </Link>
          <Link
            href="/mvp"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background text-foreground px-6 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </section>
    </div>
  );
}

const STEPS = [
  {
    number: '01',
    title: 'Pedido entra pelo WhatsApp',
    description:
      'O cliente envia mensagem. O sistema identifica o contato, roteia para o operador correto e abre o atendimento com histórico completo.',
  },
  {
    number: '02',
    title: 'Cotação automática multi-transportadora',
    description:
      'O motor de frete consulta transportadoras em tempo real e apresenta as opções ao operador com prazo e custo. Nenhuma proposta chega ao cliente sem revisão humana.',
  },
  {
    number: '03',
    title: 'Aprovação antes do pedido',
    description:
      'O operador valida a cotação, confirma as condições e autoriza. Somente após aprovação registrada o pedido é criado e a etiqueta gerada.',
  },
  {
    number: '04',
    title: 'Entrega rastreada, cockpit atualizado',
    description:
      'Coleta agendada, tracking ativo. O cliente recebe atualizações automáticas. O cockpit mostra status, SLA e exceções em tempo real para toda a equipe.',
  },
] as const;
