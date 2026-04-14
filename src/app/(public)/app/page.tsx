import {
    Smartphone, Shield, Users, Eye, Truck, ShoppingCart,
    HeadphonesIcon, AlertTriangle, CheckCircle2, Bell,
    BarChart3, MessageSquare, ClipboardList, MapPin,
    UserCheck, Package, Zap, RefreshCw, Lock, Layers,
} from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection,
    FeatureGrid, CTASection, OperationFlow,
} from '@/ui/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'App do Ecossistema — Condstore OS',
    description: 'O app que conecta cada pessoa ao pedaço certo da operação. Do gestor ao entregador, do cliente ao operador.',
};

const profiles = [
    {
        icon: BarChart3,
        role: 'Gestor',
        desc: 'Visão executiva da operação com alertas, aprovações e acompanhamento — sem depender do desktop.',
        capabilities: ['Visão de operação', 'Alertas críticos', 'Aprovações rápidas', 'Acompanhamento executivo'],
    },
    {
        icon: ClipboardList,
        role: 'Operador',
        desc: 'Filas, pedidos, conversas e exceções — tudo com contexto para agir rápido.',
        capabilities: ['Filas prioritárias', 'Pedidos em andamento', 'Conversas ativas', 'Exceções'],
    },
    {
        icon: Users,
        role: 'Cliente',
        desc: 'Acompanhamento de pedido, status em tempo real e comunicação direta.',
        capabilities: ['Status do pedido', 'Histórico', 'Confirmação', 'Comunicação'],
    },
    {
        icon: Truck,
        role: 'Entregador',
        desc: 'Rota, atualização de status, ocorrências e confirmação de entrega.',
        capabilities: ['Sequência operacional', 'Status de entrega', 'Registro de ocorrência', 'Confirmação'],
    },
    {
        icon: ShoppingCart,
        role: 'Comercial',
        desc: 'Contexto do cliente, pedidos, follow-up e pipeline comercial.',
        capabilities: ['Perfil do cliente', 'Pedidos ativos', 'Follow-up', 'Contexto comercial'],
    },
    {
        icon: HeadphonesIcon,
        role: 'Apoio / Backoffice',
        desc: 'Validações, exceções e tarefas operacionais de retaguarda.',
        capabilities: ['Validações', 'Exceções', 'Tarefas operacionais'],
    },
];

export default function AppPage() {
    return (
        <>
            {/* ─── 1. HERO ─── */}
            <HeroSection
                eyebrow="App do ecossistema"
                title={
                    <>
                        O app que conecta cada pessoa ao{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            pedaço certo da operação.
                        </span>
                    </>
                }
                subtitle="Do gestor ao entregador, do cliente ao operador — contexto, status e ações para quem precisa agir, sem expor mais do que deve."
                ctas={[
                    { label: 'Explorar a plataforma', href: '/plataforma' },
                    { label: 'Ver soluções', href: '/solucoes', variant: 'secondary' },
                ]}
            />

            {/* ─── 2. O QUE É O APP ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer narrow>
                    <SectionIntro
                        eyebrow="Não é versão reduzida"
                        title="Camada de acesso operacional por perfil."
                        description="O app não é um painel simplificado. É uma extensão real do ecossistema: cada usuário vê o que precisa, no momento certo, com permissões corretas e contexto suficiente para agir."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-10">
                        {[
                            { icon: Smartphone, label: 'Acesso distribuído', desc: 'O sistema chega até quem precisa agir, onde estiver.' },
                            { icon: Eye, label: 'Visão por perfil', desc: 'Cada papel vê exatamente o que é relevante para a sua função.' },
                            { icon: Lock, label: 'Permissões reais', desc: 'RBAC + tenant + papel do usuário. Sem atalhos.' },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label} className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 text-center">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] mx-auto mb-4">
                                        <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />
                                    </div>
                                    <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] mb-1 tracking-tight">{item.label}</h3>
                                    <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 3. PERFIS DE ACESSO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Perfis de acesso"
                        title="Cada perfil vê e faz o que precisa."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {profiles.map((p) => {
                            const Icon = p.icon;
                            return (
                                <div key={p.role} className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)]">
                                            <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />
                                        </div>
                                        <h3 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">{p.role}</h3>
                                    </div>
                                    <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed mb-4">{p.desc}</p>
                                    <ul className="space-y-1.5">
                                        {p.capabilities.map((c) => (
                                            <li key={c} className="text-xs text-[hsl(var(--ui-text-subtle))] flex items-center gap-2">
                                                <span className="h-1 w-1 rounded-full bg-[hsl(var(--ui-accent-blue))]" />
                                                {c}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 4. CASOS DE USO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Na prática"
                        title="Fluxos reais no app."
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Caso 1 */}
                        <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.15)] p-6 md:p-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-accent-blue))] mb-3 block">Caso 1 — Cliente</span>
                            <h3 className="text-lg font-bold text-[hsl(var(--ui-text))] mb-4 tracking-tight">Acompanha o pedido</h3>
                            <OperationFlow
                                steps={[
                                    { icon: CheckCircle2, label: 'Pedido confirmado', detail: 'Notificação recebida no app.' },
                                    { icon: Eye, label: 'Andamento visível', detail: 'Status atualizado em tempo real.' },
                                    { icon: Bell, label: 'Notificações', detail: 'Mudanças de status comunicadas.', accent: 'var(--ui-success)' },
                                    { icon: MessageSquare, label: 'Menos contato', detail: 'Cliente informado — reduz ansiedade.' },
                                ]}
                            />
                        </div>

                        {/* Caso 2 */}
                        <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.15)] p-6 md:p-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-accent-blue))] mb-3 block">Caso 2 — Entregador</span>
                            <h3 className="text-lg font-bold text-[hsl(var(--ui-text))] mb-4 tracking-tight">Atualiza a operação</h3>
                            <OperationFlow
                                steps={[
                                    { icon: Truck, label: 'Saída para entrega', detail: 'Rota ou sequência visível.' },
                                    { icon: MapPin, label: 'Status atualizado', detail: 'Cada parada registrada.' },
                                    { icon: AlertTriangle, label: 'Ocorrência', detail: 'Registro imediato de problemas.', accent: 'var(--ui-danger)' },
                                    { icon: CheckCircle2, label: 'Confirmação', detail: 'Entrega concluída com evidência.' },
                                ]}
                            />
                        </div>

                        {/* Caso 3 */}
                        <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.15)] p-6 md:p-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-accent-blue))] mb-3 block">Caso 3 — Gestor</span>
                            <h3 className="text-lg font-bold text-[hsl(var(--ui-text))] mb-4 tracking-tight">Aprova e acompanha</h3>
                            <OperationFlow
                                steps={[
                                    { icon: Bell, label: 'Alerta crítico', detail: 'Push notification no celular.' },
                                    { icon: CheckCircle2, label: 'Aprovação rápida', detail: 'Decisão sem abrir o desktop.', accent: 'var(--ui-success)' },
                                    { icon: BarChart3, label: 'Visão resumida', detail: 'KPIs e filas na palma da mão.' },
                                    { icon: Zap, label: 'Decisão ágil', detail: 'Operação não espera.' },
                                ]}
                            />
                        </div>

                        {/* Caso 4 */}
                        <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.15)] p-6 md:p-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-accent-blue))] mb-3 block">Caso 4 — Operador</span>
                            <h3 className="text-lg font-bold text-[hsl(var(--ui-text))] mb-4 tracking-tight">Age por exceção</h3>
                            <OperationFlow
                                steps={[
                                    { icon: AlertTriangle, label: 'Fila prioritária', detail: 'Itens que precisam de ação imediata.' },
                                    { icon: Package, label: 'Item travado', detail: 'Contexto completo visível.' },
                                    { icon: RefreshCw, label: 'Ação contextual', detail: 'Resolve sem trocar de tela.', accent: 'var(--ui-success)' },
                                    { icon: CheckCircle2, label: 'Operação destravada', detail: 'Fluxo prossegue.' },
                                ]}
                            />
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 5. O QUE O APP ENTREGA ─── */}
            <PageSection spacing="md" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Resultado"
                        title="O que muda quando a operação chega até quem age."
                    />
                    <FeatureGrid
                        columns={4}
                        items={[
                            { icon: MessageSquare, title: 'Menos contato repetitivo', description: 'Cliente informado reduz ligações e mensagens desnecessárias.' },
                            { icon: Eye, title: 'Mais rastreabilidade', description: 'Cada ação registrada, cada status atualizado.' },
                            { icon: UserCheck, title: 'Autonomia por perfil', description: 'Cada usuário age dentro do seu escopo, sem depender de outros.' },
                            { icon: Layers, title: 'Mais capilaridade', description: 'O sistema se estende para onde a operação realmente acontece.' },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 6. CONTROLE E SEGURANÇA ─── */}
            <PageSection spacing="md" borderTop>
                <PageContainer narrow>
                    <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 md:p-8 text-center">
                        <Shield className="h-6 w-6 text-[hsl(var(--ui-accent-blue))] mx-auto mb-3" />
                        <h3 className="text-base font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">
                            Controle e segurança integrados
                        </h3>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-2xl mx-auto">
                            O app respeita permissões RBAC, isolamento por tenant e papel do usuário.
                            Cada perfil acessa apenas o mínimo necessário para sua função — sem exceções.
                        </p>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 7. RELAÇÃO COM A PLATAFORMA ─── */}
            <PageSection spacing="md" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Ecossistema"
                        title="Extensão, não isolamento."
                        description="O app não opera sozinho. Ele é parte do mesmo ecossistema: cockpit, conversas, pedidos, logística e cliente — tudo conectado."
                    />
                    <FeatureGrid
                        columns={3}
                        items={[
                            { icon: BarChart3, title: 'Cockpit', description: 'Métricas e alertas acessíveis no app para gestores.' },
                            { icon: MessageSquare, title: 'Conversas', description: 'Contexto do cliente disponível para operadores e comercial.' },
                            { icon: Truck, title: 'Logística', description: 'Status e ocorrências fluem entre entregador, cockpit e cliente.' },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 8. CTA FINAL ─── */}
            <CTASection
                title="Leve a operação até quem precisa agir, acompanhar ou decidir."
                subtitle="O app do ecossistema é parte da implantação do Condstore OS."
                ctas={[
                    { label: 'Explorar soluções', href: '/solucoes' },
                    { label: 'Solicitar demonstração', href: '/contato', variant: 'secondary' },
                ]}
            />
        </>
    );
}
