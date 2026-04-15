import {
    MessageSquare, Truck, Package, Workflow, LayoutDashboard,
} from 'lucide-react';
import {
    PageContainer, PageSection, HeroSection, UseCaseGrid,
    SectionIntro, CTASection, TrustBand, OperationProof,
} from '@/ui/site';
import Link from 'next/link';

export const metadata = {
    title: 'Soluções — Condstore OS',
    description: 'Descubra como o Condstore OS resolve problemas reais: atendimento estruturado, cotação automatizada, gestão de pedidos, operação logística integrada e cockpit centralizado.',
};

export default function SolucoesPage() {
    return (
        <>
            {/* ─── 1. HERO ─── */}
            <HeroSection
                eyebrow="Soluções"
                title="Problemas reais, soluções práticas."
                subtitle="O Condstore OS traduz o sistema em aplicações que resolvem desafios operacionais concretos, facilitando a identificação e aumentando a conversão."
                ctas={[
                    { label: 'Ver prova operacional', href: '/proof' },
                    { label: 'Falar com o time', href: '/contato', variant: 'secondary' },
                ]}
            />

            {/* ─── 2. ORGANIZAÇÃO POR CASO DE USO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Casos de uso"
                        title="Cada solução resolve um problema específico."
                        description="Organizamos o produto por aplicações práticas, mostrando como o sistema operacional transforma operações logísticas."
                    />
                    <UseCaseGrid
                        useCases={[
                            {
                                icon: MessageSquare,
                                title: 'Atendimento via WhatsApp Estruturado',
                                description: 'Converse com clientes de forma organizada e produtiva, mantendo histórico completo.',
                                problem: 'Atendimentos dispersos, mensagens perdidas, sem contexto entre conversas.',
                                how: 'WhatsApp integrado ao CRM, conversas salvas automaticamente, contexto mantido entre interações.',
                                link: { label: 'Ver como funciona', href: '/como-funciona' },
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: Truck,
                                title: 'Cotação de Frete Automatizada',
                                description: 'Obtenha cotações instantâneas de múltiplas transportadoras em segundos.',
                                problem: 'Processo manual lento, erros frequentes em cotações, falta de comparação.',
                                how: 'API conectada diretamente às transportadoras, cotação multi-transportadora em milissegundos.',
                                link: { label: 'Explorar plataforma', href: '/plataforma' },
                                accentClass: 'text-[hsl(var(--ui-success))]',
                            },
                            {
                                icon: Package,
                                title: 'Gestão Completa de Pedidos',
                                description: 'Acompanhe pedidos do início ao fim com visibilidade total.',
                                problem: 'Pedidos perdidos no processo, sem tracking adequado, clientes desinformados.',
                                how: 'Sistema integrado conecta cotação a pedido, tracking em tempo real, notificações automáticas.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: Workflow,
                                title: 'Operação Logística Integrada',
                                description: 'Conecte todos os elos da cadeia logística em uma única plataforma.',
                                problem: 'Silos entre etapas, falta de coordenação, ineficiências operacionais.',
                                how: 'Eventos conectados, processamento assíncrono, visibilidade end-to-end da operação.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: LayoutDashboard,
                                title: 'Centralização da Operação (Cockpit)',
                                description: 'Tudo que o operador precisa em um único lugar.',
                                problem: 'Dados espalhados em sistemas diferentes, decisões tomadas sem contexto completo.',
                                how: 'Dashboard unificado com métricas, alertas, filas de ação e diagnóstico em tempo real.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 3. VISÃO DE CONEXÃO BETWEEN SOLUÇÕES ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer narrow>
                    <SectionIntro
                        eyebrow="Integração"
                        title="Soluções que trabalham juntas."
                        description="Não são ferramentas isoladas. Cada caso de uso se conecta aos outros, compartilhando contexto e dados em tempo real. Uma ação em atendimento impacta pedidos e logística automaticamente."
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 4. DIFERENCIAL ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer narrow>
                    <SectionIntro
                        eyebrow="Diferencial"
                        title="Supervisão humana com inteligência assistiva."
                        description="O sistema não substitui o operador. Potencializa suas decisões com dados precisos, sugestões contextuais e automação de tarefas repetitivas, mantendo o controle humano."
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 5. BLOCO DE PROVA ─── */}
            <OperationProof />

            {/* ─── 6. BLOCO DE NAVEGAÇÃO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Explore mais"
                        title="Conheça outras faces do produto."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link
                            href="/plataforma"
                            className="group flex flex-col gap-4 rounded-2xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.5)] p-6 md:p-8 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)]"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                                <LayoutDashboard className="h-5 w-5" />
                            </div>
                            <h3 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">
                                Plataforma
                            </h3>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                Entenda a arquitetura que conecta tudo.
                            </p>
                        </Link>
                        <Link
                            href="/como-funciona"
                            className="group flex flex-col gap-4 rounded-2xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.5)] p-6 md:p-8 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)]"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                                <Workflow className="h-5 w-5" />
                            </div>
                            <h3 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">
                                Como funciona
                            </h3>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                Veja o sistema em ação passo a passo.
                            </p>
                        </Link>
                        <Link
                            href="/proof"
                            className="group flex flex-col gap-4 rounded-2xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.5)] p-6 md:p-8 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)]"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <h3 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">
                                Prova operacional
                            </h3>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                Confira casos reais em produção.
                            </p>
                        </Link>
                        <Link
                            href="/contato"
                            className="group flex flex-col gap-4 rounded-2xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.5)] p-6 md:p-8 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)]"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                                <Package className="h-5 w-5" />
                            </div>
                            <h3 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">
                                Sobre nós
                            </h3>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                Conheça o time e a missão.
                            </p>
                        </Link>
                    </div>
                </PageContainer>
            </PageSection>

            <TrustBand />

            {/* ─── 7. CTA FINAL ─── */}
            <CTASection
                title="Pronto para resolver seus problemas operacionais?"
                subtitle="Comece com a solução que mais impacta seu negócio hoje."
                ctas={[
                    { label: 'Agendar demonstração', href: '/contato' },
                    { label: 'Ver prova operacional', href: '/proof', variant: 'secondary' },
                ]}
            />
        </>
    );
    );
}

