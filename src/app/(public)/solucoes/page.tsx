import {
    Truck, Users, Workflow, LayoutDashboard, Bot, Shield, Smartphone,
} from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, ModuleGrid, CTASection, TrustBand,
} from '@/ui/site';

export const metadata = {
    title: 'Soluções — Condstore OS',
    description: 'Conheça os módulos do Condstore OS: Envios, CRM, DOMINE, Cockpit, Frank Supremo e Zero-Trust Security.',
};

export default function SolucoesPage() {
    return (
        <>
            <PageSection spacing="xl">
                <PageContainer>
                    <SectionIntro
                        eyebrow="Soluções"
                        title="Cada módulo resolve um problema real."
                        description="O Condstore OS não é uma ferramenta única. É um ecossistema de módulos que trabalham juntos — cada um com responsabilidade clara e valor operacional imediato."
                    />
                </PageContainer>
            </PageSection>

            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <ModuleGrid
                        modules={[
                            {
                                icon: Truck,
                                name: 'Condstore Envios',
                                tagline: 'Gateway de frete',
                                description: 'Cotação multi-transportadora em milissegundos. Tabelas próprias normalizadas. Despacho com etiqueta e tracking. Fallback automático.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: Users,
                                name: 'Condstore CRM',
                                tagline: 'Gestão de vendas B2B',
                                description: 'Visão 360 do cliente conectada a pedidos, conversas e simulações. Pipeline operacional, não CRM genérico.',
                                accentClass: 'text-[hsl(var(--ui-success))]',
                            },
                            {
                                icon: Workflow,
                                name: 'Condstore DOMINE',
                                tagline: 'Motor de eventos',
                                description: 'Processamento assíncrono de eventos operacionais com DLQ, retry e observabilidade. A espinha dorsal do sistema.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: LayoutDashboard,
                                name: 'Cockpit OS',
                                tagline: 'Centro de comando',
                                description: 'Dashboard unificado com métricas, alertas, filas de ação e diagnóstico do sistema. Tudo que o operador precisa em uma tela.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: Bot,
                                name: 'Frank Supremo',
                                tagline: 'Inteligência artificial',
                                description: 'IA operacional que analisa padrões, sugere ações e interage com clientes via WhatsApp. Governada por budget e permissões.',
                                accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                            },
                            {
                                icon: Shield,
                                name: 'Zero-Trust Security',
                                tagline: 'Segurança nativa',
                                description: 'Multi-tenant, RBAC, audit trail, rate limiting, webhook hardening e detecção de anomalias. Segurança como infraestrutura.',
                                accentClass: 'text-[hsl(var(--ui-danger))]',
                            },
                            {
                                icon: Smartphone,
                                name: 'App do Ecossistema',
                                tagline: 'Acesso distribuído',
                                description: 'Cada perfil acessa o que precisa: gestor, operador, cliente, entregador. Extensão real da operação.',
                                accentClass: 'text-[hsl(var(--ui-success))]',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            <TrustBand />

            <CTASection
                title="Qual módulo resolve o seu problema?"
                subtitle="Comece com o que precisa agora. Escale quando fizer sentido."
                ctas={[
                    { label: 'Começar agora', href: '/signup' },
                    { label: 'Falar com o time', href: '/contato', variant: 'secondary' },
                ]}
            />
        </>
    );
}
