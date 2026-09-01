import Link from 'next/link';
import { ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import {
    InteractiveHero,
    ContextBreakdownSection,
    ContinuousFlowTransformation,
    FiveMomentsSection,
    OperationEvolutionSection,
    HumanCentricSection,
    BrandDifferentiationSection,
    ICPSection,
    FaqSection,
    ScrollReveal,
    PageContainer,
} from '@/ui/site';

export const metadata = {
    title: 'CONDSTORE OS — O Cockpit Operacional do WhatsApp à Logística B2B',
    description: 'Cockpit operacional para PMEs B2B. Mantenha o contexto da negociação do WhatsApp ao caminhão com cotação de frete, pedido e supervisão sem perder o fio.',
};

export const revalidate = 86400;

export default function HomePage() {
    return (
        <main className="bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] min-h-screen selection:bg-[hsl(var(--ui-text))] selection:text-[hsl(var(--ui-page))]">
            {/* 1. HERO INTERATIVO (Posicionamento & Demonstração Viva) */}
            <InteractiveHero />

            {/* 2. SEÇÃO "A DOR" (Context Breakdown / Zigue-zague) */}
            <ScrollReveal>
                <ContextBreakdownSection />
            </ScrollReveal>

            {/* 3. TRANSFORMAÇÃO (Fluxo Unificado Sem Ruído) */}
            <ScrollReveal>
                <ContinuousFlowTransformation />
            </ScrollReveal>

            {/* 4. COMO FUNCIONA (Os 5 Momentos Operacionais) */}
            <ScrollReveal>
                <FiveMomentsSection />
            </ScrollReveal>

            {/* 5. EVOLUÇÃO DA OPERAÇÃO (Crescimento sem complexidade de TI) */}
            <ScrollReveal>
                <OperationEvolutionSection />
            </ScrollReveal>

            {/* 6. HUMANO NO CENTRO (Filosofia do Sistema Invisível) */}
            <ScrollReveal>
                <HumanCentricSection />
            </ScrollReveal>

            {/* 7. DIFERENCIAÇÃO ESTRATÉGICA (Nem CRM, nem ERP, nem Chatbot isolado) */}
            <ScrollReveal>
                <BrandDifferentiationSection />
            </ScrollReveal>

            {/* 8. PARA QUEM É (ICP & Foco Operacional B2B) */}
            <ScrollReveal>
                <ICPSection />
            </ScrollReveal>

            {/* 9. PROVA OPERACIONAL / ESTRUTURA RECEBIMENTO DE CASOS REAIS */}
            <ScrollReveal>
                <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface))]">
                    <PageContainer>
                        <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.7)] bg-[hsl(var(--ui-surface-elevated))] p-8 md:p-12 text-center max-w-4xl mx-auto space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-surface)/0.6)] text-xs font-semibold text-[hsl(var(--ui-text))]">
                                <ShieldCheck className="h-4 w-4 text-[hsl(var(--ui-success))]" />
                                <span>Garantia de Governança & Rastreabilidade</span>
                            </div>
                            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[hsl(var(--ui-text))]">
                                Operação Supervisionada com Trilha de Auditoria Real
                            </h2>
                            <p className="text-sm sm:text-base text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-2xl mx-auto">
                                No CONDSTORE OS, cada aprovação de pedido, envio de cotação e troca de status é gravada com usuário, timestamp e contexto comercial. Sem números maquiados ou promessas irreais.
                            </p>
                            <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-[hsl(var(--ui-text-muted))]">
                                <span className="bg-[hsl(var(--ui-surface))] px-4 py-2 rounded-xl border border-[hsl(var(--ui-border)/0.5)]">
                                    Auditoria de decisões
                                </span>
                                <span className="bg-[hsl(var(--ui-surface))] px-4 py-2 rounded-xl border border-[hsl(var(--ui-border)/0.5)]">
                                    Isolamento de dados por Tenant
                                </span>
                                <span className="bg-[hsl(var(--ui-surface))] px-4 py-2 rounded-xl border border-[hsl(var(--ui-border)/0.5)]">
                                    Frank Copiloto Supervisionado
                                </span>
                            </div>
                        </div>
                    </PageContainer>
                </section>
            </ScrollReveal>

            {/* 10. PERGUNTAS FREQUENTES (FAQ) */}
            <ScrollReveal>
                <FaqSection />
            </ScrollReveal>

            {/* 11. CTA FINAL (Chamada com Alinhamento Comercial e Estágio de Venda) */}
            <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface))] relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[hsl(var(--ui-border)/0.2)] blur-[120px] rounded-full pointer-events-none" />

                <PageContainer narrow>
                    <div className="relative z-10 text-center space-y-6">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--ui-text-subtle))]">
                            Próxima Decisão Operacional
                        </p>

                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] leading-tight">
                            Veja como o CONDSTORE OS funciona na sua operação real.
                        </h2>

                        <p className="text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-2xl mx-auto">
                            Transforme o atendimento via WhatsApp em uma linha de execução sem ruído, mantendo seu time no controle e seus clientes atendidos com velocidade.
                        </p>

                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/piloto"
                                className="inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[hsl(var(--ui-text))] px-8 text-sm font-bold text-[hsl(var(--ui-page))] shadow-md transition-all hover:opacity-90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-text))]"
                            >
                                Solicitar avaliação operacional
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <Link
                                href="/contato"
                                className="inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-surface)/0.5)] px-8 text-sm font-semibold text-[hsl(var(--ui-text))] transition-all hover:bg-[hsl(var(--ui-surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-text))]"
                            >
                                Agendar uma conversa
                            </Link>
                        </div>
                    </div>
                </PageContainer>
            </section>
        </main>
    );
}
