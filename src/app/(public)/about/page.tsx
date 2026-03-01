import { Users, Target, Zap } from 'lucide-react';
import { SectionTracker } from '@/ui/lib/track-client';

export const metadata = {
    title: 'Sobre',
    description: 'Nossa missão de automatizar a logística para operações em escala.',
};

export default function AboutPage() {
    return (
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-32 flex flex-col os-root">
            <SectionTracker page="about" section="hero" />

            <div className="mb-16 max-w-2xl text-center mx-auto">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] mb-6">
                    Redefinindo o padrão letárgico da logística nacional
                </h1>
                <p className="text-lg text-[hsl(var(--ui-text-muted))]">
                    Nascemos para tirar o peso operacional de lojistas que precisam focar em vender, não em rastrear pacotes e negociar fretes.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mx-auto mt-12">
                <div className="flex flex-col items-center text-center p-8 bg-[hsl(var(--ui-surface))] rounded-[var(--radius-card)] border border-[hsl(var(--ui-border)/0.5)] shadow-[var(--shadow-soft)]">
                    <div className="h-12 w-12 rounded-full bg-[hsl(var(--ui-accent-blue)/0.1)] flex items-center justify-center text-[hsl(var(--ui-accent-blue))] mb-6">
                        <Target className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[hsl(var(--ui-text))] mb-3">Nossa Missão</h3>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                        Tornar a escala operacional invisível e zero-touch para os fundadores de Varejo e D2C.
                    </p>
                </div>

                <div className="flex flex-col items-center text-center p-8 bg-[hsl(var(--ui-surface))] rounded-[var(--radius-card)] border border-[hsl(var(--ui-border)/0.5)] shadow-[var(--shadow-soft)]">
                    <div className="h-12 w-12 rounded-full bg-[hsl(var(--ui-success)/0.1)] flex items-center justify-center text-[hsl(var(--ui-success))] mb-6">
                        <Zap className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[hsl(var(--ui-text))] mb-3">Velocidade Extrema</h3>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                        Decisões de frete com base em mili-segundos, sem dependências de infraestrutura frágil.
                    </p>
                </div>

                <div className="flex flex-col items-center text-center p-8 bg-[hsl(var(--ui-surface))] rounded-[var(--radius-card)] border border-[hsl(var(--ui-border)/0.5)] shadow-[var(--shadow-soft)]">
                    <div className="h-12 w-12 rounded-full bg-[hsl(var(--ui-accent-purple)/0.1)] flex items-center justify-center text-[hsl(var(--ui-accent-purple))] mb-6">
                        <Users className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[hsl(var(--ui-text))] mb-3">Parceria Real</h3>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                        Não somos mais um SaaS. Somos a equipe logística artificial dedicada 24/7 ao seu faturamento.
                    </p>
                </div>
            </div>

        </div>
    );
}
