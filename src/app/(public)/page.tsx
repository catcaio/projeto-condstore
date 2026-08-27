import Link from 'next/link';
import {
    ArrowRight,
    Check,
    LockKeyhole,
    MessageCircle,
    Package,
    Send,
    ShieldCheck,
    Sparkles,
    Truck,
} from 'lucide-react';
import { AgilizapFlowSignature } from '@/ui/site/agilizap-flow-signature';

export const metadata = {
    title: 'AGILIZAP — Um fluxo comercial contínuo',
    description:
        'AGILIZAP transforma contatos, negociações e operações fragmentadas em um fluxo comercial contínuo.',
};

const steps = [
    ['01', 'Canal', 'O contato entra.', 'WhatsApp, e-mail, marketplace ou entrada manual começam a mesma jornada.', MessageCircle],
    ['02', 'Identidade', 'O cliente é reconhecido.', 'O contexto acompanha a pessoa mesmo quando o canal ou a conversa muda.', ShieldCheck],
    ['03', 'Negociação', 'A conversa continua.', 'A negociação sobrevive à troca de canal e à reabertura da conversa.', Send],
    ['04', 'Proposta', 'Cada versão permanece.', 'v1, v2, v3: a proposta pode ser revisada sem apagar o contexto anterior.', Package],
    ['05', 'Execução', 'A operação avança.', 'Pedido, frete, transportadora e rastreio seguem a mesma linha de contexto.', Truck],
] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ag-muted)]">{children}</p>;
}

export default function HomePage() {
    return (
        <div className="bg-[var(--ag-paper)] text-[var(--ag-ink)]">
            <section className="relative overflow-hidden border-b border-black/[0.08] bg-[var(--ag-ink)] text-white">
                <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:48px_48px]" />
                <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 sm:px-8 lg:pb-28 lg:pt-28">
                    <div className="grid items-center gap-14 lg:grid-cols-[0.88fr_1.12fr]">
                        <div>
                            <SectionLabel>Operação comercial contínua</SectionLabel>
                            <h1 data-testid="public-hero-title" className="mt-5 max-w-3xl font-[family-name:var(--font-space)] text-5xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[72px]">
                                O contexto continua. A operação também.
                            </h1>
                            <p className="mt-7 max-w-xl text-lg leading-8 text-white/65 sm:text-xl">
                                AGILIZAP transforma contatos, negociações e operações fragmentadas em um fluxo comercial contínuo.
                            </p>
                            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                                <Link href="/piloto" data-testid="public-primary-cta" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--ag-accent)] px-6 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                                    Conhecer o AGILIZAP <ArrowRight className="h-4 w-4" />
                                </Link>
                                <a href="#como-funciona" className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 px-6 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                                    Ver o fluxo
                                </a>
                            </div>
                        </div>
                        <AgilizapFlowSignature />
                    </div>
                </div>
            </section>

            <section id="produto" className="border-b border-black/[0.08]">
                <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
                    <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
                        <div>
                            <SectionLabel>O problema</SectionLabel>
                            <h2 className="mt-4 max-w-md font-[family-name:var(--font-space)] text-4xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">O trabalho não quebra. O contexto quebra.</h2>
                        </div>
                        <div className="grid gap-px overflow-hidden rounded-lg border border-black/[0.08] bg-black/[0.08] sm:grid-cols-2">
                            {[
                                ['01', 'Canais separados', 'Uma conversa começa no WhatsApp, outra chega por e-mail. O histórico não deveria desaparecer com a troca de canal.'],
                                ['02', 'Negociação sem continuidade', 'Reabrir uma conversa não deveria significar reconstruir o que já foi combinado.'],
                                ['03', 'Propostas que perdem contexto', 'Revisar uma proposta precisa preservar o que mudou — e o que já estava decidido.'],
                                ['04', 'Operação desconectada', 'Pedido, frete, transportadora e rastreio são etapas da mesma operação, não mundos separados.'],
                            ].map(([number, title, description]) => (
                                <article key={number} className="bg-[var(--ag-paper)] p-7 sm:p-8">
                                    <span className="font-mono text-[11px] text-[var(--ag-muted)]">{number}</span>
                                    <h3 className="mt-8 text-lg font-semibold tracking-tight">{title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-[var(--ag-muted)]">{description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="como-funciona" className="bg-white">
                <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
                    <div className="max-w-2xl">
                        <SectionLabel>Como funciona</SectionLabel>
                        <h2 className="mt-4 font-[family-name:var(--font-space)] text-4xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">Uma cadeia causal. Não uma coleção de módulos.</h2>
                    </div>
                    <div className="mt-16 divide-y divide-black/[0.08] border-y border-black/[0.08]">
                        {steps.map(([number, label, title, description, Icon]) => (
                            <article key={number} className="grid gap-5 py-7 sm:grid-cols-[72px_180px_1fr] sm:items-center">
                                <span className="font-mono text-xs text-[var(--ag-muted)]">{number}</span>
                                <div className="flex items-center gap-3"><Icon className="h-4 w-4 text-[var(--ag-accent)]" aria-hidden="true" /><span className="font-mono text-xs uppercase tracking-[0.12em]">{label}</span></div>
                                <div className="sm:border-l sm:border-black/[0.08] sm:pl-8"><h3 className="font-[family-name:var(--font-space)] text-xl font-medium tracking-tight">{title}</h3><p className="mt-1 text-sm leading-6 text-[var(--ag-muted)]">{description}</p></div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="frank" className="border-y border-black/[0.08] bg-[var(--ag-paper)]">
                <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
                    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                        <div>
                            <SectionLabel>Frank AI</SectionLabel>
                            <h2 className="mt-4 font-[family-name:var(--font-space)] text-4xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">IA dentro do contexto. Humanos no comando.</h2>
                            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--ag-muted)]">Frank atua sobre o contexto comercial e operacional que o AGILIZAP construiu. Ele pode apoiar o trabalho, mas ações de risco exigem aprovação humana.</p>
                        </div>
                        <div className="rounded-lg border border-black/[0.1] bg-white p-6 shadow-[0_18px_60px_rgba(11,14,19,0.06)] sm:p-8">
                            <div className="flex items-center justify-between border-b border-black/[0.08] pb-5">
                                <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--ag-accent)] text-white"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-semibold">Frank</p><p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ag-muted)]">assistência contextual</p></div></div>
                                <span className="rounded-full border border-[#17C964]/30 px-2.5 py-1 font-mono text-[10px] text-[#159e50]">aguardando aprovação</span>
                            </div>
                            <div className="space-y-4 py-7">
                                <div className="rounded-md bg-[var(--ag-paper)] p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ag-muted)]">contexto</p><p className="mt-2 text-sm leading-6">Cliente retomou a negociação. Proposta v2 está registrada e o frete precisa ser considerado.</p></div>
                                <div className="rounded-md border border-[var(--ag-accent)]/20 bg-[var(--ag-accent)]/[0.04] p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ag-accent)]">ação sugerida</p><p className="mt-2 text-sm leading-6">Revisar a proposta mantendo o histórico e apresentar o próximo passo ao operador.</p></div>
                            </div>
                            <div className="flex items-center gap-2 border-t border-black/[0.08] pt-5 text-xs text-[var(--ag-muted)]"><LockKeyhole className="h-3.5 w-3.5" />Ações de risco só avançam com aprovação humana.</div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="tecnologia" className="bg-[var(--ag-ink)] text-white">
                <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
                    <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
                        <div><SectionLabel>Arquitetura SaaS</SectionLabel><h2 className="mt-4 font-[family-name:var(--font-space)] text-4xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">Cada empresa tem seu próprio ambiente.</h2></div>
                        <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2">
                            <div className="bg-[var(--ag-ink)] p-7 sm:p-8"><LockKeyhole className="h-5 w-5 text-[var(--ag-accent)]" /><h3 className="mt-7 text-lg font-semibold">Isolamento por empresa</h3><p className="mt-3 text-sm leading-6 text-white/55">O modelo multi-tenant mantém cada operação em seu próprio ambiente lógico, desde a concepção.</p></div>
                            <div className="bg-[var(--ag-ink)] p-7 sm:p-8"><ShieldCheck className="h-5 w-5 text-[var(--ag-accent)]" /><h3 className="mt-7 text-lg font-semibold">Controle como princípio</h3><p className="mt-3 text-sm leading-6 text-white/55">Continuidade não significa autonomia cega: o fluxo mantém contexto, responsabilidade e aprovação humana.</p></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-[var(--ag-paper)]">
                <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 lg:py-32">
                    <SectionLabel>Comece pelo fluxo</SectionLabel>
                    <h2 className="mt-4 font-[family-name:var(--font-space)] text-4xl font-medium leading-tight tracking-[-0.045em] sm:text-6xl">Menos contexto perdido. Mais operação contínua.</h2>
                    <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--ag-muted)]">Veja como o AGILIZAP pode organizar a jornada entre contato, negociação, proposta, pedido e logística.</p>
                    <Link href="/piloto" className="mt-9 inline-flex h-12 items-center gap-2 rounded-md bg-[var(--ag-accent)] px-6 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-ink)]">Conhecer o AGILIZAP <ArrowRight className="h-4 w-4" /></Link>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ag-muted)]"><span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5" />fluxo contínuo</span><span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5" />contexto preservado</span><span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5" />aprovação humana</span></div>
                </div>
            </section>
        </div>
    );
}
