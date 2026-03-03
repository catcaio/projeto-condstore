import Link from 'next/link';
import { Truck, BarChart3, Bot, CheckCircle2, LifeBuoy, PackageOpen, LayoutDashboard } from 'lucide-react';
import { Button } from '@/ui/components/button';
import { CaseProofSection } from '@/ui/components/case-proof-section';
import { HowItWorksSection } from '@/ui/components/how-it-works-section';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import dynamic from 'next/dynamic';
import { ENABLE_CONCEPT_LAYER } from '@/config/flags';

const ConceptHero = dynamic(() => import("./concept-layer/ConceptHero"), { ssr: true });

export const metadata = {
    title: 'LojaCond | Automação Logística',
    description: 'Automatize o frete da sua loja. Rescue, Logistics e Full OS integrados.',
};

export const revalidate = 86400; // 24h caching for Edge network

export default function PublicHomePage() {
    const isDev = process.env.NODE_ENV === 'development';

    return (
        <>
            {ENABLE_CONCEPT_LAYER && <ConceptHero />}
            <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-32 flex flex-col items-center text-center gap-16 relative">
                <SectionTracker page="landing" section="hero" />

                <div className="max-w-3xl space-y-6">
                    <h1 className="text-[var(--text-hero)] font-bold text-[hsl(var(--ui-text))] leading-tight tracking-tight mb-4">
                        Automatize o frete da sua loja em <span className="text-[hsl(var(--ui-accent-blue))]">minutos.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-[hsl(var(--ui-text-muted))] max-w-[280px] md:max-w-2xl mx-auto leading-relaxed">
                        Cotações inteligentes, múltiplas transportadoras e automação via WhatsApp.
                        Escalonamento sem aumentar sua folha de pagamentos.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                        <TrackedLink href="/pricing" passHref trackPage="landing" trackSection="hero" trackElement="hero_primary" legacyBehavior>
                            <Button variant="primary" size="lg" className="w-full sm:w-auto">
                                Começar agora
                            </Button>
                        </TrackedLink>
                        <TrackedLink href="#como-funciona" passHref trackPage="landing" trackSection="hero" trackElement="hero_demo" legacyBehavior>
                            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                                Ver demo
                            </Button>
                        </TrackedLink>
                    </div>
                </div>

                <CaseProofSection />

                <HowItWorksSection />

                <div className="py-12 border-y border-[hsl(var(--ui-border)/0.5)] w-full grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* RESCUE BLOCK */}
                    <div className="flex flex-col items-center text-center gap-4 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-8 shadow-[var(--shadow-soft)] hover:shadow-lg transition-all">
                        <div className="h-14 w-14 rounded-full bg-[hsl(var(--ui-danger)/0.1)] flex items-center justify-center text-[hsl(var(--ui-danger))]">
                            <LifeBuoy className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[hsl(var(--ui-text))]">Rescue</h3>
                            <p className="text-sm font-semibold text-[hsl(var(--ui-danger))] mt-1 mb-2">Recuperação e Retenção</p>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))]">Fluxos de WhatsApp nativos que reengajam boletos, pix não pagos e carrinhos abandonados conectando sua transportadora à conversão.</p>
                        </div>
                    </div>

                    {/* LOGISTICS BLOCK */}
                    <div className="flex flex-col items-center text-center gap-4 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-8 shadow-[var(--shadow-soft)] hover:shadow-lg transition-all relative">
                        <div className="absolute top-0 right-4 transform -translate-y-1/2 rounded-[var(--radius-button)] py-1 px-3 bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))] text-[10px] font-bold uppercase tracking-wider">
                            Core
                        </div>
                        <div className="h-14 w-14 rounded-full bg-[hsl(var(--ui-accent-blue)/0.1)] flex items-center justify-center text-[hsl(var(--ui-accent-blue))]">
                            <PackageOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[hsl(var(--ui-text))]">Logistics</h3>
                            <p className="text-sm font-semibold text-[hsl(var(--ui-accent-blue))] mt-1 mb-2">Gateway & Cotação Zero-touch</p>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))]">Acesso a mais de 30 operadoras logísticas. Você controla as margens por UTM e garante a entrega mais barata em mili-segundos.</p>
                        </div>
                    </div>

                    {/* FULL OS BLOCK */}
                    <div className="flex flex-col items-center text-center gap-4 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-8 shadow-[var(--shadow-soft)] hover:shadow-lg transition-all">
                        <div className="h-14 w-14 rounded-full bg-[hsl(var(--ui-success)/0.1)] flex items-center justify-center text-[hsl(var(--ui-success))]">
                            <LayoutDashboard className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[hsl(var(--ui-text))]">Full OS</h3>
                            <p className="text-sm font-semibold text-[hsl(var(--ui-success))] mt-1 mb-2">Visibilidade Total</p>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))]">Relatórios avançados integrando Custo de Frete, Custo de Aquisição (CAC) e rastreamento de IA (Frank) unificando toda sua frota.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-6 pb-8">
                    <p className="text-sm font-semibold tracking-wide text-[hsl(var(--ui-text-muted))] uppercase">
                        Aprovado pelas melhores operações logísticas
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 opacity-50 grayscale select-none">
                        {/* Placeholder logos */}
                        <span className="text-xl font-bold font-sans">EmpresaLog®</span>
                        <span className="text-xl font-extrabold italic">FastDrop</span>
                        <span className="text-xl font-mono">VarejoTech.io</span>
                        <span className="text-xl font-bold uppercase tracking-widest">SENDIT</span>
                    </div>
                </div>

                <div className="rounded-[var(--radius-card)] bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] p-8 max-w-4xl w-full flex flex-col md:flex-row items-center justify-between shadow-[var(--shadow-soft)]">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className="h-12 w-12 rounded-full bg-[hsl(var(--ui-success)/0.1)] flex items-center justify-center text-[hsl(var(--ui-success))]">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                            <h4 className="text-[hsl(var(--ui-text))] font-bold text-lg">Integração Imediata</h4>
                            <p className="text-[hsl(var(--ui-text-muted))] text-sm">Escalável com 99.9% de uptime real</p>
                        </div>
                    </div>
                    <TrackedLink href="/pricing" passHref trackPage="landing" trackSection="bottom_cta" trackElement="bottom_primary" legacyBehavior>
                        <Button variant="primary">Criar conta</Button>
                    </TrackedLink>
                </div>

            </div>
        </>
    );
}
