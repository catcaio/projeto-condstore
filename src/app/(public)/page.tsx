import {
    Truck, BarChart3, Bot, MessageSquare, Shield, Zap,
    Package, Users, Clock, TrendingUp, Workflow, LayoutDashboard,
    ArrowRight, Target
} from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection,
    FeatureGrid, FlowSection, CTASection, ModuleGrid, ComparisonBand,
} from '@/ui/site';
import Link from 'next/link';

export const metadata = {
    title: 'Condstore OS — Infraestrutura operacional premium para logística B2B',
    description: 'O sistema operacional que unifica frete, vendas, atendimento e inteligência artificial em uma única plataforma. Elimine planilhas, integrações frágeis e operação manual.',
};

export const revalidate = 86400;

export default function HomePage() {
    return (
        <>
            {/* ─── 1. HERO ─── */}
            <HeroSection
                eyebrow="Infraestrutura operacional premium"
                title={
                    <>
                        O sistema operacional que a sua{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            logística merece.
                        </span>
                    </>
                }
                subtitle="Unifique frete, vendas, atendimento e inteligência artificial em uma única plataforma construída para operações reais no Brasil."
                ctas={[
                    { label: 'Começar agora', href: '/signup' },
                    { label: 'Como funciona', href: '/como-funciona', variant: 'secondary' },
                ]}
            />

            {/* ─── 2. QUEBRA DE CATEGORIA ─── */}
            <PageSection spacing="md" borderTop>
                <PageContainer narrow>
                    <div className="text-center">
                        <p className="text-xl md:text-2xl font-light text-[hsl(var(--ui-text-muted))] leading-relaxed">
                            Nem ERP. Nem planilha. Nem mais um SaaS genérico.
                        </p>
                        <p className="mt-4 text-lg md:text-xl font-semibold text-[hsl(var(--ui-text))]">
                            O Condstore OS é a infraestrutura que conecta cada parte da sua operação logística — do WhatsApp do cliente ao status do motorista — em um único fluxo inteligente.
                        </p>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 3. O CAOS HOJE ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="O problema"
                        title="A operação logística brasileira ainda opera no escuro."
                        description="Pedidos em planilha. Frete cotado por telefone. Tracking manual. Atendimento desconectado da operação. Informação fragmentada entre 5, 10, 15 ferramentas."
                    />
                    <FeatureGrid
                        columns={4}
                        items={[
                            {
                                icon: Clock,
                                title: 'Cotação lenta',
                                description: 'Ligar para transportadora, esperar retorno, digitar o preço no sistema. Cada cotação consome 15 minutos que ninguém tem.',
                            },
                            {
                                icon: Package,
                                title: 'Pedidos invisíveis',
                                description: 'Pedido entrou no WhatsApp, foi para o ERP, saiu em nota fiscal — mas ninguém sabe onde está agora.',
                            },
                            {
                                icon: MessageSquare,
                                title: 'Atendimento cego',
                                description: 'O operador responde o cliente sem saber se a entrega atrasou, se o pedido foi aprovado ou se a cotação mudou.',
                            },
                            {
                                icon: TrendingUp,
                                title: 'Margem invisível',
                                description: 'Sem visibilidade de custo por envio, região e transportadora, a margem desaparece sem aviso.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 4. A VIRADA ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="A virada"
                        title="Do caos para controle total em um único sistema."
                    />
                    <ComparisonBand
                        left={{
                            label: 'Antes do Condstore OS',
                            tone: 'negative',
                            items: [
                                'Cotação manual por telefone ou portal da transportadora',
                                'Pedido vive em planilha sem estado definido',
                                'Atendimento desconectado do status logístico',
                                'Margem calculada uma vez por mês, se calculada',
                                'Cada ferramenta é um silo de informação',
                            ],
                        }}
                        right={{
                            label: 'Com o Condstore OS',
                            tone: 'positive',
                            items: [
                                'Cotação automática multi-transportadora em milissegundos',
                                'Pedido rastreado do checkout ao ponto de entrega',
                                'Atendente vê contexto completo do cliente e da carga',
                                'Dashboard de margem por transportadora, região e período',
                                'Uma única plataforma, um único fluxo operacional',
                            ],
                        }}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 5. A OPERAÇÃO EM MOVIMENTO ─── */}
            <PageSection spacing="lg" borderTop id="como-funciona">
                <PageContainer>
                    <SectionIntro
                        eyebrow="Fluxo operacional"
                        title="Como sua operação funciona com o Condstore OS."
                        description="Do pedido ao pós-venda, cada etapa tem visibilidade total e ação imediata."
                    />
                    <FlowSection
                        steps={[
                            {
                                number: '01',
                                title: 'Pedido entra',
                                description: 'Via WhatsApp, portal ou API. O sistema captura, valida e roteia automaticamente para a fila de processamento.',
                            },
                            {
                                number: '02',
                                title: 'Cotação instantânea',
                                description: 'Multi-transportadora, com margem calculada em tempo real. A melhor opção é sugerida por região, prazo e custo.',
                            },
                            {
                                number: '03',
                                title: 'Operação executa',
                                description: 'Etiqueta gerada, coleta agendada, tracking ativo. Exceções são detectadas e escaladas ao operador.',
                            },
                            {
                                number: '04',
                                title: 'Feedback fecha o ciclo',
                                description: 'Cliente recebe atualização automática. Métricas alimentam o cockpit. SLA é auditado em tempo real.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 6. MÓDULOS DO ECOSSISTEMA ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Ecossistema"
                        title="Módulos que trabalham juntos."
                        description="Cada módulo resolve um problema real. Juntos, formam o sistema operacional completo da sua logística."
                    />
                    <ModuleGrid
                        modules={[
                            {
                                icon: Truck,
                                name: 'Condstore Envios',
                                tagline: 'Gateway de frete',
                                description: 'Cotação, despacho e tracking multi-transportadora com tabelas próprias e fallback inteligente.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: Users,
                                name: 'Condstore CRM',
                                tagline: 'Gestão de vendas B2B',
                                description: 'Visão 360 do cliente conectada a pedidos, conversas e simulações em um único painel.',
                                accentClass: 'text-[hsl(var(--ui-success))]',
                            },
                            {
                                icon: Workflow,
                                name: 'Condstore DOMINE',
                                tagline: 'Motor de eventos',
                                description: 'Processamento assíncrono de eventos operacionais com DLQ, retry e auditoria completa.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: LayoutDashboard,
                                name: 'Cockpit OS',
                                tagline: 'Centro de comando',
                                description: 'Dashboard operacional com métricas, alertas, filas de ação e diagnóstico do sistema em tempo real.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: Bot,
                                name: 'Frank Supremo',
                                tagline: 'Inteligência artificial',
                                description: 'IA operacional que analisa padrões, sugere ações e interage com clientes via WhatsApp.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: Shield,
                                name: 'Zero-Trust Security',
                                tagline: 'Segurança nativa',
                                description: 'Autenticação multi-tenant, rate limiting, audit trail e detecção de anomalias integrados à plataforma.',
                                accentClass: 'text-[hsl(var(--ui-danger))]',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 7. CLIENTE NO CENTRO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer narrow>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                            <SectionIntro
                                eyebrow="Comércio conversacional"
                                title="O cliente fala. O sistema responde."
                                description="O Condstore OS transforma cada conversa no WhatsApp em dado operacional. Cotação, pedido, tracking e pós-venda — tudo no canal que o cliente já usa."
                                align="left"
                            />
                        </div>
                        <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 md:p-8 space-y-4">
                            <div className="flex flex-col gap-3">
                                <ChatBubble side="right" text="Preciso de uma cotação SP → Recife, 12kg" />
                                <ChatBubble side="left" text="Encontrei 3 opções para você:" />
                                <ChatBubble side="left" text="1. Braspress — R$ 42,50 (3 dias úteis)&#10;2. Jadlog — R$ 38,90 (5 dias úteis)&#10;3. Total Express — R$ 55,00 (2 dias úteis)" />
                                <ChatBubble side="right" text="Fecha com a Braspress." />
                                <ChatBubble side="left" text="✓ Pedido criado. Coleta agendada para amanhã." />
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 8. BENEFÍCIOS REAIS ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Resultados"
                        title="Benefícios que aparecem no caixa."
                        description="Não são promessas genéricas. São resultados mensuráveis de quem substituiu o jeito antigo."
                    />
                    <FeatureGrid
                        columns={3}
                        items={[
                            {
                                icon: Zap,
                                title: 'Cotação em milissegundos',
                                description: 'Multi-transportadora com tabela própria e API. Sem telefonema, sem espera, sem planilha.',
                            },
                            {
                                icon: BarChart3,
                                title: 'Margem visível por envio',
                                description: 'Dashboard de custo real por transportadora, região e canal de venda. Decisão baseada em dado, não em feeling.',
                            },
                            {
                                icon: Target,
                                title: 'SLA auditável',
                                description: 'Prazo prometido vs. prazo real, por transportadora, por rota. Exceções flagradas em tempo real.',
                            },
                            {
                                icon: MessageSquare,
                                title: 'Atendimento com contexto',
                                description: 'O operador vê pedido, frete, tracking e histórico do cliente em uma única tela antes de responder.',
                            },
                            {
                                icon: Shield,
                                title: 'Segurança corporativa',
                                description: 'Multi-tenant, RBAC, audit trail, rate limiting e detecção de anomalias. Sem atalhos.',
                            },
                            {
                                icon: Bot,
                                title: 'IA que entende a operação',
                                description: 'Frank Supremo analisa padrões, responde clientes e sugere ações — mas o operador sempre tem a palavra final.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 9. PARA QUEM É ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Para quem"
                        title="Construído para quem leva logística a sério."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                title: 'Distribuidores B2B',
                                desc: 'Que despacham centenas de encomendas por dia em múltiplas transportadoras e precisam de visibilidade e controle de margem.',
                            },
                            {
                                title: 'Operadores logísticos',
                                desc: 'Que gerenciam coleta, tracking e pós-venda para vários embarcadores e precisam de um cockpit unificado.',
                            },
                            {
                                title: 'E-commerce B2B',
                                desc: 'Que vendem por WhatsApp, portal e inside sales e precisam de cotação automática e gestão de pedidos integrada ao frete.',
                            },
                        ].map((segment) => (
                            <div key={segment.title} className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 md:p-7">
                                <h3 className="text-base font-bold text-[hsl(var(--ui-text))] mb-3 tracking-tight">{segment.title}</h3>
                                <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">{segment.desc}</p>
                            </div>
                        ))}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 10. IMPLANTAÇÃO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Implantação"
                        title="Operando em dias, não em meses."
                        description="Sem projeto de 6 meses. Sem consultoria de implantação. A plataforma é projetada para começar a funcionar rápido."
                    />
                    <FlowSection
                        steps={[
                            {
                                number: '01',
                                title: 'Conta criada',
                                description: 'Cadastro do tenant, configuração de transportadoras e ativação do WhatsApp.',
                            },
                            {
                                number: '02',
                                title: 'Tabelas carregadas',
                                description: 'Tabelas de frete importadas e normalizadas. Regras de margem e prioridade configuradas.',
                            },
                            {
                                number: '03',
                                title: 'Operação ao vivo',
                                description: 'Cockpit ativo, cotação funcionando, equipe operando. Suporte disponível nos primeiros dias.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 11. PREVIEW DE SOLUÇÕES ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Soluções"
                        title="Veja como cada área se beneficia."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                title: 'Logística',
                                desc: 'Cotação, despacho, tracking e exceções em um único painel.',
                                href: '/solucoes',
                            },
                            {
                                title: 'Comercial',
                                desc: 'Pedidos, clientes e pipeline conectados à operação em tempo real.',
                                href: '/solucoes',
                            },
                            {
                                title: 'Atendimento',
                                desc: 'WhatsApp, conversas e contexto operacional integrados nativamente.',
                                href: '/solucoes',
                            },
                        ].map((sol) => (
                            <Link
                                key={sol.title}
                                href={sol.href}
                                className="group rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 md:p-7 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.4)]"
                            >
                                <h3 className="text-base font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight flex items-center gap-2">
                                    {sol.title}
                                    <ArrowRight className="h-4 w-4 text-[hsl(var(--ui-text-muted))] group-hover:translate-x-1 transition-transform" />
                                </h3>
                                <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">{sol.desc}</p>
                            </Link>
                        ))}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 12. CTA FINAL ─── */}
            <CTASection
                title="Pronto para profissionalizar sua operação?"
                subtitle="Comece a operar com o Condstore OS e veja a diferença de ter infraestrutura de verdade."
                ctas={[
                    { label: 'Começar agora', href: '/signup' },
                    { label: 'Falar com o time', href: '/about', variant: 'secondary' },
                ]}
            />
        </>
    );
}

/* ─── Helper: WhatsApp-style chat bubble ─── */
function ChatBubble({ side, text }: { side: 'left' | 'right'; text: string }) {
    return (
        <div className={`flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    side === 'right'
                        ? 'bg-[hsl(var(--ui-accent-blue)/0.15)] text-[hsl(var(--ui-text))] rounded-br-md'
                        : 'bg-[hsl(var(--ui-surface-elevated))] text-[hsl(var(--ui-text-muted))] rounded-bl-md'
                }`}
            >
                {text}
            </div>
        </div>
    );
}
