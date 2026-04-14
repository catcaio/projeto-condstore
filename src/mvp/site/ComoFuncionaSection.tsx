import Link from 'next/link';

/**
 * "Como funciona" — /mvp/como-funciona
 * Step-by-step supervised flow with high-density editorial layout.
 */
export function ComoFuncionaSection() {
  return (
    <div className="max-w-3xl mx-auto space-y-16">
      {/* ── Header ───────────────────────────────────────────────── */}
      <section className="space-y-4 pt-4">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'hsl(var(--mvp-accent))' }}
        >
          Como funciona
        </p>
        <h1
          className="text-3xl sm:text-4xl font-semibold leading-[1.1] tracking-[-0.02em]"
          style={{ color: 'hsl(var(--mvp-text-1))' }}
        >
          Do pedido à entrega, sem ponto cego.
        </h1>
        <p
          className="text-base max-w-xl leading-relaxed"
          style={{ color: 'hsl(var(--mvp-text-2))' }}
        >
          O CONDSTORE OS conecta atendimento, cotação, aprovação e logística num fluxo único.
          Cada etapa tem responsável, horário e estado registrado.
        </p>
      </section>

      {/* ── Steps ────────────────────────────────────────────────── */}
      <section aria-label="Etapas do fluxo">
        <ol className="space-y-3">
          {STEPS.map((step, idx) => (
            <li
              key={step.number}
              className="flex gap-5 p-5 rounded-[var(--mvp-radius-md)]"
              style={{
                background: 'hsl(var(--mvp-surface-1))',
                border: '1px solid hsl(var(--mvp-border))',
              }}
            >
              {/* Step number */}
              <div className="shrink-0 pt-0.5">
                <span
                  className="w-7 h-7 rounded-[var(--mvp-radius-xs)] flex items-center justify-center text-xs font-bold"
                  style={{
                    background:
                      idx === 0
                        ? 'hsl(var(--mvp-accent-bg))'
                        : 'hsl(var(--mvp-surface-3))',
                    color:
                      idx === 0
                        ? 'hsl(var(--mvp-accent))'
                        : 'hsl(var(--mvp-text-3))',
                  }}
                  aria-hidden="true"
                >
                  {step.number}
                </span>
              </div>
              {/* Content */}
              <div className="space-y-1 min-w-0">
                <h2
                  className="text-sm font-semibold"
                  style={{ color: 'hsl(var(--mvp-text-1))' }}
                >
                  {step.title}
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'hsl(var(--mvp-text-3))' }}
                >
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Gate callout ─────────────────────────────────────────── */}
      <section
        aria-label="Gate de aprovação"
        className="p-5 rounded-[var(--mvp-radius-md)] space-y-2"
        style={{
          background: 'hsl(var(--mvp-accent-bg))',
          border: '1px solid hsl(var(--mvp-accent-border))',
        }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'hsl(var(--mvp-accent))' }}
        >
          Gate obrigatório
        </p>
        <p
          className="text-sm font-semibold"
          style={{ color: 'hsl(var(--mvp-text-1))' }}
        >
          Nenhum pedido avança sem aprovação operacional registrada.
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'hsl(var(--mvp-text-2))' }}
        >
          O operador revisa a cotação, confirma as condições comerciais e autoriza a execução.
          O sistema nunca fecha pedido de forma autônoma.
        </p>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="space-y-4 pb-4">
        <h2
          className="text-base font-semibold"
          style={{ color: 'hsl(var(--mvp-text-1))' }}
        >
          Pronto para operar no fluxo supervisionado?
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center h-11 px-6 rounded-[var(--mvp-radius-sm)] text-sm font-medium transition-all duration-150"
            style={{
              background: 'hsl(var(--mvp-accent))',
              color: 'white',
            }}
          >
            Acessar plataforma →
          </Link>
          <Link
            href="/mvp"
            className="inline-flex items-center justify-center h-11 px-6 rounded-[var(--mvp-radius-sm)] text-sm font-medium border transition-all duration-150"
            style={{
              border: '1px solid hsl(var(--mvp-border-strong))',
              color: 'hsl(var(--mvp-text-2))',
              background: 'transparent',
            }}
          >
            ← Voltar ao início
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
