import Link from 'next/link';
import type { Metadata } from 'next';
import {
    freezeNotice,
    glossaryItems,
    parallelCards,
    roadmapItems,
    statusCards,
    studyHubSections,
    timelineItems,
} from './content';

export const metadata: Metadata = {
    title: 'Área de Estudo | Estrutura Quântica-Relacional',
    description:
        'Hub didático isolado da frente de estudo Estrutura Quântica-Relacional com visão geral, timeline, glossário, paralelos com CONDSTORE e status do Rindler MVP.',
};

export default function QuantumRelationalStudyHubPage() {
    const FreezeIcon = freezeNotice.icon;

    return (
        <div className="bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))]">
            <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-6 lg:py-12">
                <aside className="lg:sticky lg:top-24 lg:h-fit">
                    <nav className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.55)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ui-accent-blue))]">Hub didático</p>
                        <h2 className="mt-2 text-sm font-semibold">Área de Estudo · Estrutura Quântica-Relacional</h2>
                        <ul className="mt-4 space-y-1">
                            {studyHubSections.map((section) => (
                                <li key={section.id}>
                                    <Link
                                        href={`#${section.id}`}
                                        className="block rounded-md px-3 py-2 text-sm text-[hsl(var(--ui-text-muted))] transition hover:bg-[hsl(var(--ui-page)/0.8)] hover:text-[hsl(var(--ui-text))]"
                                    >
                                        {section.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                <div className="space-y-8">
                    <section id="visao-geral" className="rounded-3xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.45)] p-6 md:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ui-accent-blue))]">Visão geral da frente</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Hub central da Área de Estudo — Estrutura Quântica-Relacional</h1>
                        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[hsl(var(--ui-text-muted))] md:text-base">
                            Esta rota isolada organiza, em leitura rápida, os fundamentos da conjectura, o estágio atual do teste em Rindler e os paralelos com o CONDSTORE.
                            {' '}
                            É uma base central de consulta técnica-didática, sem interferir no fluxo operacional principal do produto.
                        </p>
                    </section>

                    <section id="ideia-central" className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.4)] p-6">
                        <h2 className="text-xl font-semibold">Ideia central em linguagem simples</h2>
                        <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))] md:text-base">
                            A hipótese central assume que três saídas evoluem juntas: <strong>geometria efetiva</strong>, <strong>decoerência</strong> e <strong>entropia relevante</strong>.
                            {' '}
                            Quando uma muda de forma consistente, as outras precisam refletir essa mudança no mesmo quadro de análise. Rindler é usado como ambiente mínimo para testar esse acoplamento com menos ruído.
                        </p>
                    </section>

                    <section id="linha-do-tempo" className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.4)] p-6">
                        <h2 className="text-xl font-semibold">Linha do tempo da ideia</h2>
                        <ol className="mt-5 space-y-4">
                            {timelineItems.map((item, index) => (
                                <li key={item.title} className="rounded-xl border border-[hsl(var(--ui-border)/0.35)] bg-[hsl(var(--ui-page)/0.6)] p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--ui-accent-blue)/0.2)] text-xs font-semibold text-[hsl(var(--ui-accent-blue))]">
                                            {index + 1}
                                        </span>
                                        <p className="text-sm font-semibold">{item.title}</p>
                                        <span className="text-xs text-[hsl(var(--ui-text-muted))]">{item.period}</span>
                                    </div>
                                    <p className="mt-2 text-sm text-[hsl(var(--ui-text-muted))]">{item.description}</p>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section id="glossario" className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.4)] p-6">
                        <h2 className="text-xl font-semibold">Glossário rápido</h2>
                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                            {glossaryItems.map((item) => (
                                <article key={item.term} className="rounded-xl border border-[hsl(var(--ui-border)/0.35)] bg-[hsl(var(--ui-page)/0.55)] p-4">
                                    <h3 className="text-sm font-semibold">{item.term}</h3>
                                    <p className="mt-2 text-sm text-[hsl(var(--ui-text-muted))]">{item.definition}</p>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section id="paralelos-condstore" className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.4)] p-6">
                        <h2 className="text-xl font-semibold">Paralelos com CONDSTORE</h2>
                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                            {parallelCards.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <article key={card.title} className="rounded-xl border border-[hsl(var(--ui-border)/0.35)] bg-[hsl(var(--ui-page)/0.55)] p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--ui-accent-blue)/0.15)]">
                                                <Icon className="h-4 w-4 text-[hsl(var(--ui-accent-blue))]" />
                                            </div>
                                            <h3 className="text-sm font-semibold">{card.title}</h3>
                                        </div>
                                        <p className="mt-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                            <strong>Estudo:</strong>
                                            {' '}
                                            {card.studyView}
                                        </p>
                                        <p className="mt-2 text-sm text-[hsl(var(--ui-text-muted))]">
                                            <strong>CONDSTORE:</strong>
                                            {' '}
                                            {card.condstoreView}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section id="estado-rindler" className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.4)] p-6">
                        <h2 className="text-xl font-semibold">Estado atual do teste (Rindler MVP)</h2>
                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                            {statusCards.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <article key={card.title} className="rounded-xl border border-[hsl(var(--ui-border)/0.35)] bg-[hsl(var(--ui-page)/0.55)] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <Icon className="mt-0.5 h-4 w-4 text-[hsl(var(--ui-accent-blue))]" />
                                                <h3 className="text-sm font-semibold">{card.title}</h3>
                                            </div>
                                            <span className="rounded-full border border-[hsl(var(--ui-border)/0.45)] px-2 py-0.5 text-xs text-[hsl(var(--ui-text-muted))]">{card.tag}</span>
                                        </div>
                                        <p className="mt-3 text-sm text-[hsl(var(--ui-text-muted))]">{card.summary}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section id="proxima-execucao" className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.4)] p-6">
                        <h2 className="text-xl font-semibold">Próxima execução (roadmap curto)</h2>
                        <div className="mt-5 space-y-3">
                            {roadmapItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article key={item.title} className="rounded-xl border border-[hsl(var(--ui-border)/0.35)] bg-[hsl(var(--ui-page)/0.55)] p-4">
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4 text-[hsl(var(--ui-accent-blue))]" />
                                            <h3 className="text-sm font-semibold">{item.title}</h3>
                                        </div>
                                        <p className="mt-2 text-sm text-[hsl(var(--ui-text-muted))]">{item.description}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section id="freeze-frentes" className="rounded-2xl border border-[hsl(var(--ui-warning)/0.35)] bg-[hsl(var(--ui-warning)/0.08)] p-6">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--ui-warning)/0.18)]">
                                <FreezeIcon className="h-5 w-5 text-[hsl(var(--ui-warning))]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">{freezeNotice.title}</h2>
                                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{freezeNotice.description}</p>
                                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[hsl(var(--ui-text-muted))]">
                                    {freezeNotice.points.map((point) => (
                                        <li key={point}>{point}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
