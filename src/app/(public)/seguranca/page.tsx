import {
    Shield, Globe, UserCheck, FileText, Eye, Database,
    TrendingUp, Lock, Fingerprint, Layers, ClipboardCheck,
    AlertTriangle, Activity, Settings, Bug, RefreshCw,
} from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection,
    FeatureGrid, CTASection,
} from '@/ui/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Segurança e LGPD — Condstore OS',
    description: 'Conheça a arquitetura de segurança e governança do Condstore OS: multi-tenant, rastro de decisões, humano no loop e conformidade LGPD.',
};

export default function SegurancaPage() {
    return (
        <>
            {/* ─── 1. HERO ─── */}
            <HeroSection
                eyebrow="Segurança e governança"
                title={
                    <>
                        Segurança e governança para{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            operações críticas.
                        </span>
                    </>
                }
                subtitle="Isolamento por tenant, rastro imutável de decisões e conformidade LGPD. O Condstore OS protege sua operação do WhatsApp ao cockpit."
                ctas={[
                    { label: 'Solicitar avaliação operacional', href: '/piloto' },
                    { label: 'Entrar no sistema', href: '/login', variant: 'secondary' },
                ]}
            />

            {/* ─── 2. MULTI-TENANT ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                        <div>
                            <SectionIntro
                                eyebrow="Isolamento"
                                title="Cada operação em seu próprio tenant."
                                description="Dados, configurações e permissões são completamente isolados entre tenants. Nenhuma operação enxerga ou interfere na outra."
                                align="left"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { icon: Database, label: 'Isolamento de dados', desc: 'Cada tenant opera em seu próprio espaço. Dados nunca se misturam.' },
                                { icon: Settings, label: 'Configuração por tenant', desc: 'Transportadoras, margens, integrações e regras definidas independentemente.' },
                                { icon: Lock, label: 'Limites de acesso', desc: 'Usuários só acessam dados do tenant ao qual pertencem. Sem exceção.' },
                                { icon: Layers, label: 'Escalabilidade', desc: 'Novos tenants são criados sem impactar a performance dos existentes.' },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="rounded-xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-5">
                                        <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))] mb-3" />
                                        <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] mb-1 tracking-tight">{item.label}</h3>
                                        <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 3. CONTROLE DE ACESSO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Controle de acesso"
                        title="Cada perfil vê e faz apenas o que deve."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: UserCheck,
                                role: 'Operador',
                                desc: 'Acessa pedidos, conversas e logística do dia a dia. Sem acesso a configurações do tenant.',
                                permissions: ['Visualizar pedidos', 'Responder conversas', 'Consultar tracking'],
                            },
                            {
                                icon: ClipboardCheck,
                                role: 'Gestor',
                                desc: 'Tudo do operador mais métricas, relatórios e configurações de fluxo.',
                                permissions: ['Dashboard de métricas', 'Relatórios de margem', 'Configurar regras'],
                            },
                            {
                                icon: Shield,
                                role: 'Admin',
                                desc: 'Acesso completo ao tenant: equipe, integrações, segurança e auditoria.',
                                permissions: ['Gerenciar equipe', 'Configurar integrações', 'Audit trail completo'],
                            },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.role} className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 md:p-7">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)]">
                                            <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />
                                        </div>
                                        <h3 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">{item.role}</h3>
                                    </div>
                                    <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed mb-4">{item.desc}</p>
                                    <ul className="space-y-1.5">
                                        {item.permissions.map((p) => (
                                            <li key={p} className="text-xs text-[hsl(var(--ui-text-subtle))] flex items-center gap-2">
                                                <span className="h-1 w-1 rounded-full bg-[hsl(var(--ui-accent-blue))]" />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 4. RASTREABILIDADE ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Rastreabilidade"
                        title="Cada ação gera registro imutável."
                        description="Quem fez, quando fez, o que mudou. Audit trail completo para toda mutação do sistema."
                    />
                    <FeatureGrid
                        columns={3}
                        items={[
                            {
                                icon: FileText,
                                title: 'Alteração de pedido',
                                description: 'Cada mudança de status, responsável ou valor é registrada com timestamp e ator.',
                            },
                            {
                                icon: Activity,
                                title: 'Simulações',
                                description: 'Cada cotação gerada registra parâmetros, transportadoras consultadas e resultado.',
                            },
                            {
                                icon: RefreshCw,
                                title: 'Mudanças logísticas',
                                description: 'Status de despacho, coleta, tracking e exceções — tudo com timeline auditável.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 5. OBSERVABILIDADE ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Observabilidade"
                        title="Visibilidade sobre o que acontece dentro do sistema."
                    />
                    <FeatureGrid
                        columns={3}
                        items={[
                            {
                                icon: Eye,
                                title: 'Eventos',
                                description: 'Cada ação gera um evento estruturado. Feed de eventos acessível no cockpit.',
                            },
                            {
                                icon: AlertTriangle,
                                title: 'Exceções',
                                description: 'Falhas de integração, timeouts e anomalias são detectados e escalados automaticamente.',
                            },
                            {
                                icon: Activity,
                                title: 'Estado da operação',
                                description: 'Health checks, circuit breakers e diagnóstico operacional via cockpit.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 6. CONFORMIDADE LGPD E GOVERNANÇA ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Conformidade LGPD"
                        title="Governança e proteção de dados pessoais."
                        description="Tratamos dados pessoais com rigor técnico e jurídico, garantindo transparência e controle para os titulares e para sua empresa."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { icon: Database, title: 'Isolamento por Tenant', desc: 'Cada operação tem seus dados isolados. Consultas nunca cruzam fronteiras de tenant.' },
                            { icon: UserCheck, title: 'Humano no Loop', desc: 'Decisões críticas e sensíveis sempre exigem validação humana. Sem automação cega.' },
                            { icon: Fingerprint, title: 'Controle de Acesso', desc: 'RBAC + validação de sessão + rate limiting por IP e tenant em cada requisição.' },
                            { icon: FileText, title: 'Logs de Responsabilidade', desc: 'Acesso a dados e mutações são registrados com responsabilidade. Audit trail para compliance.' },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.title} className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6">
                                    <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))] mb-3" />
                                    <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">{item.title}</h3>
                                    <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 7. EVOLUÇÃO CONTÍNUA ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Evolução"
                        title="Segurança é parte contínua da plataforma."
                    />
                    <FeatureGrid
                        columns={3}
                        items={[
                            {
                                icon: TrendingUp,
                                title: 'Melhorias contínuas',
                                description: 'Cada release inclui revisão de segurança. Vulnerabilidades são corrigidas proativamente.',
                            },
                            {
                                icon: Bug,
                                title: 'Revisões de arquitetura',
                                description: 'Componentes críticos passam por revisão periódica de design e implementação.',
                            },
                            {
                                icon: Globe,
                                title: 'Governança crescente',
                                description: 'Novos controles são adicionados à medida que a plataforma ganha maturidade.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 8. CTA FINAL ─── */}
            <CTASection
                title="Sua operação com segurança real."
                subtitle="Isolamento, rastro de decisão e conformidade LGPD são a fundação do Condstore OS."
                ctas={[
                    { label: 'Solicitar avaliação operacional', href: '/piloto' },
                    { label: 'Entrar no sistema', href: '/login', variant: 'secondary' },
                ]}
            />
        </>
    );
}
