import React from 'react';
import { Plug, MessageCircle, LayoutDashboard } from 'lucide-react';

export function HowItWorksSection() {
    const steps = [
        {
            icon: Plug,
            title: 'Conecte sua loja',
            description: 'Inteface plug-and-play com ERPs e carrinhos (WooCommerce, Bling, Shopify, Tiny) ou operação 100% manual.',
        },
        {
            icon: MessageCircle,
            title: 'Ative o WhatsApp + Frete',
            description: 'Determine suas próprias margens, rotas preferidas para operadoras, e crie a régua de rastreamento automática.',
        },
        {
            icon: LayoutDashboard,
            title: 'Acompanhe no Cockpit',
            description: 'Controle em tempo real de filas operacionais, funil de cotações geradas, UTMs e ROI com dados unificados.',
        }
    ];

    return (
        <section id="como-funciona" className="w-full max-w-[var(--container-max-width)] mx-auto px-6 lg:px-8 py-20">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-[hsl(var(--ui-text))] mb-4 tracking-tight">
                    Como funciona
                </h2>
                <p className="text-lg text-[hsl(var(--ui-text-muted))] max-w-2xl mx-auto">
                    Implantação indolor desenhada para velocidade, dispensando a complexidade de meses de projeto.
                </p>
            </div>

            <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 xl:gap-12 relative z-10">
                {steps.map((step, idx) => (
                    <div key={idx} className="flex-1 flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-8 shadow-[var(--shadow-soft)] hover:shadow-lg transition-all text-left relative overflow-hidden group">

                        {/* Passo ID watermark */}
                        <div className="absolute -top-4 -right-4 text-9xl font-black text-[hsl(var(--ui-accent-blue)/0.03)] select-none pointer-events-none group-hover:text-[hsl(var(--ui-accent-blue)/0.05)] transition-colors">
                            {idx + 1}
                        </div>

                        <div className="h-14 w-14 rounded-full bg-[hsl(var(--ui-accent-blue)/0.1)] flex items-center justify-center text-[hsl(var(--ui-accent-blue))] mb-8 shrink-0 relative z-10">
                            <step.icon className="h-6 w-6" />
                        </div>
                        <div className="relative z-10 flex-1">
                            <h3 className="text-xl font-bold text-[hsl(var(--ui-text))] mb-3">
                                {step.title}
                            </h3>
                            <p className="text-[hsl(var(--ui-text-muted))] text-sm leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
