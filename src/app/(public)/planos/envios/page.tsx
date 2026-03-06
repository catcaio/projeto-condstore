'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Box, RefreshCcw, LayoutDashboard, Truck, Bot, ArrowRight } from 'lucide-react';
import { Button } from '@/ui/components/button';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { PricingTable, PlanDefinition, FeatureCategory } from '@/ui/components/marketing/pricing-table';

export default function PricingPage() {
    return (
        <div className="flex flex-col items-center w-full os-root bg-[#F4F7FA] overflow-hidden">
            <PlanosHero />
            <FeatureModules />
            <PricingTable
                title="Veja tudo o que cada plano Olist Envios oferece"
                planos={planosEnvios}
                features={featuresEnvios}
            />
            <FinalCTA />
        </div>
    );
}

function PlanosHero() {
    return (
        <section data-testid="pricing-hero" className="relative w-full pt-32 pb-48 flex flex-col items-center overflow-hidden bg-gradient-to-b from-[#E8F0FE] to-[#F4F7FA]">
            {/* Olist Style Blue Glow */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#1a56db] rounded-full blur-[150px] opacity-10 pointer-events-none -translate-y-1/2 translate-x-1/2" />

            <SectionTracker page="pricing_envios" section="hero" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-blue-200 bg-white/50 backdrop-blur text-blue-800 text-sm font-medium mb-10 shadow-sm"
            >
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Simples, seguro e escalável
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-[72px] font-extrabold tracking-[-0.04em] text-[#0A2540] text-center max-w-4xl leading-[1.1] mb-8"
            >
                Planos que não limitam o seu crescimento
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl md:text-2xl text-[#425466] text-center font-light mb-12"
            >
                Teste o hub logístico sem inserir dados do cartão
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col md:flex-row gap-4 mb-20 relative z-10"
            >
                <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-sm text-[#0A2540] font-medium border border-gray-100">
                    <Truck className="w-5 h-5 text-blue-600" />
                    Cotações e Envios <span className="text-blue-600">ilimitados</span>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-sm text-[#0A2540] font-medium border border-gray-100">
                    <LayoutDashboard className="w-5 h-5 text-blue-600" />
                    Usuários <span className="text-blue-600">ilimitados</span>
                </div>
            </motion.div>
        </section>
    );
}

function FeatureModules() {
    const modules = [
        { icon: Truck, label: 'Routing Inteligente' },
        { icon: RefreshCcw, label: 'Hub de Integração' },
        { icon: Box, label: 'Envios' },
        { icon: ShieldCheck, label: 'Segurança Zero-Trust' },
        { icon: Bot, label: 'Agentes de IA (DOMINE)' }
    ];

    return (
        <section className="w-full bg-[#0A2540] py-16 -mt-32 relative z-20 rounded-t-[48px] overflow-hidden shadow-2xl">
            <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-4">
                {modules.map((m, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 px-6 py-4 bg-[#112F4E] rounded-full border border-white/10 text-white font-medium hover:bg-white/10 cursor-pointer transition-colors"
                    >
                        <m.icon className="w-5 h-5 text-[#3291FF]" />
                        {m.label}
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

function FinalCTA() {
    return (
        <div className="w-full max-w-7xl mx-auto px-6 mb-24 relative z-10 -mt-10">
            <div className="p-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[40px] shadow-2xl flex flex-col items-center text-center">
                <h2 className="text-4xl font-extrabold text-white mb-6">Comece agora e veja o ritmo da sua operação mudar</h2>
                <TrackedLink href="/login" passHref trackPage="pricing_envios" trackSection="footer" trackElement="cta_footer" legacyBehavior>
                    <Button className="bg-white text-blue-600 hover:bg-gray-50 h-14 px-10 rounded-full font-bold text-lg shadow-xl shadow-blue-900/20 group">
                        Crie sua conta grátis
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </TrackedLink>
            </div>
        </div>
    );
}

const planosEnvios: PlanDefinition[] = [
    { name: 'Starter', cta: 'Começar Grátis', color: 'bg-gray-100 text-gray-800' },
    { name: 'Essencial', cta: 'Teste grátis de 7 dias', color: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' },
    { name: 'Pro', cta: 'Falar com vendas', color: 'bg-[#0A2540] text-white' },
    { name: 'Enterprise', cta: 'Falar com Vendas', color: 'bg-white text-[#0A2540] border border-[#0A2540]' }
];

const featuresEnvios: FeatureCategory[] = [
    {
        category: "Operação e Lojas", items: [
            { name: "Cotações por Mês", vals: ["1.000", "10.000", "Ilimitado", "Ilimitado"] },
            { name: "Lojas e Origens", vals: ["1 CNPJ", "Até 3", "Ilimitado", "Múltiplos Tenants"] },
            { name: "Geração de Etiquetas ZPL", vals: [true, true, true, true] },
            { name: "Múltiplos Contratos Correios", vals: [false, true, true, true] }
        ]
    },
    {
        category: "Inteligência Logística", items: [
            { name: "Hub Multi-Transportadoras", vals: [true, true, true, true] },
            { name: "Routing de Menor Custo", info: "Calcula automaticamente a rota mais barata em milisegundos via API Edge", vals: [false, true, true, true] },
            { name: "Auditoria de Faturas", vals: [false, false, true, true] },
            { name: "Logística Reversa Aut.", vals: [false, true, true, true] }
        ]
    },
    {
        category: "Suporte e Integração", items: [
            { name: "SLA Garantido", vals: ["Nenhum", "Nenhum", "99.9%", "99.99%"] },
            { name: "Acesso a API / Webhooks", vals: [false, true, true, true] },
            { name: "Gerente de Conta", vals: [false, false, true, true] }
        ]
    }
];
