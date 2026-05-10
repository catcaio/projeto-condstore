import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CaseProofSection } from '../ui/components/case-proof-section';

describe('CaseProofSection', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('deve retornar nulo se CASE_PROOF_ENABLED=false via ENV', () => {
        process.env.CASE_PROOF_ENABLED = 'false';
        const result = CaseProofSection();
        expect(result).toBeNull();
    });

    it('deve renderizar a árvore jsx quando feature toggle não estiver false', () => {
        process.env.CASE_PROOF_ENABLED = 'true';
        const result = CaseProofSection();
        expect(result).not.toBeNull();

        // Verifica a estrutura base como Server Component test
        expect(result).toMatchInlineSnapshot(`
          <section
            className="w-full max-w-[var(--container-max-width)] mx-auto px-6 lg:px-8 mb-16 relative"
          >
            <SectionTracker
              page="landing"
              section="case_proof"
            />
            <div
              className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-8 md:p-12 shadow-[var(--shadow-soft)] hover:shadow-lg transition-shadow relative overflow-hidden"
            >
              <h2
                className="text-3xl font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight"
              >
                Resultados reais em operação
              </h2>
              <p
                className="text-[hsl(var(--ui-text-muted))] mb-12 font-medium"
              >
                CONDSTORE OS (Tenant Piloto)
                 — automação de frete + WhatsApp
              </p>
              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12"
              >
                <div
                  className="bg-[hsl(var(--ui-surface-elevated))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-6 flex flex-col items-center justify-center shadow-sm"
                >
                  <span
                    className="text-4xl font-extrabold text-[hsl(var(--ui-accent-blue))] mb-2 tracking-tight"
                  >
                    +1.2k
                  </span>
                  <span
                    className="text-xs font-semibold text-[hsl(var(--ui-text-subtle))] uppercase tracking-wider"
                  >
                    Cotações processadas
                  </span>
                </div>
                <div
                  className="bg-[hsl(var(--ui-surface-elevated))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-6 flex flex-col items-center justify-center shadow-sm"
                >
                  <span
                    className="text-4xl font-extrabold text-[hsl(var(--ui-accent-blue))] mb-2 tracking-tight"
                  >
                    &lt; 2s
                  </span>
                  <span
                    className="text-xs font-semibold text-[hsl(var(--ui-text-subtle))] uppercase tracking-wider"
                  >
                    Tempo médio
                  </span>
                </div>
                <div
                  className="bg-[hsl(var(--ui-surface-elevated))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-6 flex flex-col items-center justify-center shadow-sm"
                >
                  <span
                    className="text-4xl font-extrabold text-[hsl(var(--ui-accent-blue))] mb-2 tracking-tight"
                  >
                    R$ 3.5k
                  </span>
                  <span
                    className="text-xs font-semibold text-[hsl(var(--ui-text-subtle))] uppercase tracking-wider"
                  >
                    Economia estimada
                  </span>
                </div>
              </div>
              <div
                className="max-w-3xl text-center mb-8 px-4 md:px-12 border-l-4 border-[hsl(var(--ui-accent-blue))]"
              >
                <p
                  className="text-[hsl(var(--ui-text))] text-lg md:text-xl font-medium leading-relaxed italic text-left"
                >
                  "
                  Resultados comprovados em produção com automação de frete de ponta a ponta integrada ao WhatsApp. Operação orgânica rodando sem sobressaltos.
                  "
                </p>
              </div>
              <div
                className="mt-4 flex justify-end w-full"
              >
                <TrackedLink
                  href="#como-funciona"
                  passHref={true}
                  trackElement="caseproof_demo"
                  trackPage="landing"
                  trackSection="case_proof"
                >
                  <ForwardRef(Button)
                    className="font-semibold text-[hsl(var(--ui-accent-blue))] hover:text-[hsl(var(--ui-accent-blue-strong))] hover:bg-[hsl(var(--ui-accent-blue)/0.1)]"
                    variant="ghost"
                  >
                    Ver como funciona →
                  </ForwardRef(Button)>
                </TrackedLink>
              </div>
            </div>
          </section>
        `);
    });
});
