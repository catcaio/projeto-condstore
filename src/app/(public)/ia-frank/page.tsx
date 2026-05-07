import { Metadata } from 'next';
import Link from 'next/link';
import {
    ArrowRight,
    Bot,
    CheckCircle2,
    MessageCircle,
    Shield,
    ShieldCheck,
    Zap,
    Search,
    Brain,
    UserCheck,
} from 'lucide-react';
import {
    PageContainer,
    PageSection,
    ScrollReveal,
    SectionIntro,
} from '@/ui/site';

export const metadata: Metadata = {
    title: 'IA Frank: Copiloto Supervisionado | CONDSTORE OS',
    description: 'Conheça o Frank, a inteligência assistiva que atua como copiloto supervisionado do seu time operacional.',
};

const frankFeatures = [
    {
        icon: Brain,
        title: 'Contexto em segundos',
        description: 'Frank resume o histórico de conversas e identifica a intenção do cliente, preparando o terreno para o operador.',
    },
    {
        icon: Search,
        title: 'Busca de similaridade',
        description: 'Identifica padrões em cotações e pedidos anteriores para sugerir a melhor decisão logística.',
    },
    {
        icon: Zap,
        title: 'Sugestão de resposta',
        description: 'Agiliza o atendimento sugerindo respostas baseadas no contexto comercial, sempre aguardando validação humana.',
    },
    {
        icon: ShieldCheck,
        title: 'Sinalização de riscos',
        description: 'Alerta sobre inconsistências de dados ou possíveis gargalos antes que eles virem um problema.',
    },
];

const boundaryItems = [
    {
        title: 'Onde o Frank atua',
        points: [
            'Classificação de intenções no WhatsApp.',
            'Sugestão de transportadoras e rotas.',
            'Organização de dados para o cockpit.',
            'Resumos executivos de operação.',
        ],
        icon: UserCheck,
        accent: 'text-[hsl(var(--ui-success))]',
    },
    {
        title: 'Limites de segurança',
        points: [
            'Nunca fala com o cliente sem supervisão.',
            'Não aprova pagamentos ou cotações sozinho.',
            'Não altera status de pedido de forma autônoma.',
            'Sempre exige o "OK" de um operador humano.',
        ],
        icon: Shield,
        accent: 'text-[hsl(var(--ui-danger))]',
    },
];

export default function IAFrankPage() {
    return (
        <>
            <PageSection spacing="lg">
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 items-start">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.45)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-muted))]">
                                IA Frank Supervisionada
                            </span>
                            <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] leading-[1.08]">
                                Frank: o copiloto que entende sua operação.
                            </h1>
                            <p className="mt-6 text-lg md:text-xl text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-2xl">
                                O Frank não substitui seu time — ele o torna mais rápido. Uma IA assistiva focada em organizar o caos operacional do WhatsApp e da logística, sempre sob supervisão humana.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-4">
                                <Link
                                    href="/contato"
                                    className="inline-flex h-12 items-center justify-center rounded-full bg-[hsl(var(--ui-accent-blue))] px-8 text-sm font-bold text-white transition-all hover:bg-[hsl(var(--ui-accent-blue-strong))]"
                                >
                                    Solicitar demonstração
                                </Link>
                                <Link
                                    href="/como-funciona"
                                    className="inline-flex h-12 items-center justify-center rounded-full border border-[hsl(var(--ui-border))] px-8 text-sm font-semibold text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-surface-elevated))]"
                                >
                                    Ver fluxo supervisionado
                                </Link>
                            </div>
                        </div>

                        <aside className="rounded-3xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.35)] p-8">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                                <Bot className="h-6 w-6" />
                            </div>
                            <h2 className="mt-6 text-xl font-bold text-[hsl(var(--ui-text))]">Assistência, não autonomia.</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                No CONDSTORE OS, acreditamos que decisões críticas precisam de responsabilidade humana. O Frank cuida da carga cognitiva repetitiva para que você foque na estratégia.
                            </p>
                            <ul className="mt-6 space-y-3">
                                {[
                                    'Sem "alucinações" em frente ao cliente.',
                                    'Rastro total de sugestões e aprovações.',
                                    'Focado em dados reais da sua operação.',
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                        <CheckCircle2 className="h-4 w-4 text-[hsl(var(--ui-success))]" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </aside>
                    </div>
                </PageContainer>
            </PageSection>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Capacidades"
                            title="Onde o Frank gera valor imediato"
                            description="Quatro pilares de assistência para acelerar o ciclo Conversa -> Cotação -> Pedido."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {frankFeatures.map((feature) => {
                                const Icon = feature.icon;
                                return (
                                    <article key={feature.title} className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.3)] p-6">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-muted)/0.5)] text-[hsl(var(--ui-text))]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-base font-bold text-[hsl(var(--ui-text))]">{feature.title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{feature.description}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Governança"
                            title="Controle total sobre a IA"
                            description="Definimos limites claros para garantir a segurança da sua marca e da sua operação."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {boundaryItems.map((group) => {
                                const Icon = group.icon;
                                return (
                                    <article key={group.title} className="rounded-3xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.3)] p-8">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-muted)/0.5)] ${group.accent}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <h3 className="text-xl font-bold text-[hsl(var(--ui-text))]">{group.title}</h3>
                                        </div>
                                        <ul className="mt-6 space-y-4">
                                            {group.points.map((point) => (
                                                <li key={point} className="flex items-start gap-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ui-border-strong))]" />
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                );
                            })}
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer narrow>
                        <div className="rounded-3xl bg-[hsl(var(--ui-accent-blue))] px-8 py-12 text-center text-white">
                            <h2 className="text-3xl font-extrabold md:text-4xl">Pronto para ter um copiloto na sua operação?</h2>
                            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
                                Agende uma demonstração e veja como o Frank auxilia o atendimento e a logística em fluxo integrado.
                            </p>
                            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <Link
                                    href="/contato"
                                    className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-bold text-[hsl(var(--ui-accent-blue))] transition-transform hover:scale-105"
                                >
                                    Solicitar avaliação operacional
                                </Link>
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>
        </>
    );
}
