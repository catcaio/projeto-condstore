'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Bot } from 'lucide-react';
import { Button } from '@/ui/components/button';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { PricingTable, PlanDefinition, FeatureCategory } from '@/ui/components/marketing/pricing-table';

export default function PricingDOMINEPage() {
    return (
        <div className="flex flex-col items-center w-full os-root bg-[#F4F7FA] overflow-hidden">
            <DOMINEPricingHero />
            <PricingTable
                title="Conheça a Infraestrutura DOMINE"
                planos={planosDomine}
                features={featuresDomine}
            />
            <FinalCTA />
        </div>
    );
}

function DOMINEPricingHero() {
    return (
        <section className="relative w-full pt-32 pb-24 flex flex-col items-center overflow-hidden bg-[#0A2540]">
            <SectionTracker page="pricing_domine" section="hero" />

            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[150px] opacity-20 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-indigo-500/30 bg-white/5 backdrop-blur text-indigo-300 text-sm font-medium mb-10 shadow-sm"
            >
                <Bot className="w-4 h-4 text-indigo-400" />
                Infraestrutura de Automação IA
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-[72px] font-extrabold tracking-[-0.04em] text-white text-center max-w-4xl leading-[1.1] mb-8"
            >
                Escala brutal, sem gargalos.
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl md:text-2xl text-blue-100/70 text-center font-light mb-12"
            >
                Planos dimensionados pelo seu poder de processamento.
            </motion.p>
        </section>
    );
}

function FinalCTA() {
    return (
        <div className="w-full max-w-7xl mx-auto px-6 mb-24 relative z-10 -mt-10">
            <div className="p-12 bg-gradient-to-r from-indigo-600 to-purple-800 rounded-[40px] shadow-2xl flex flex-col items-center text-center">
                <h2 className="text-4xl font-extrabold text-white mb-6">Traga Automação Cognitiva para seu Hub</h2>
                <TrackedLink href="/signup" passHref trackPage="pricing_domine" trackSection="footer" trackElement="cta_footer" legacyBehavior>
                    <Button className="bg-white text-indigo-700 hover:bg-gray-50 h-14 px-10 rounded-full font-bold text-lg shadow-xl shadow-indigo-900/20 group">
                        Agendar Implementação
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </TrackedLink>
            </div>
        </div>
    );
}

const planosDomine: PlanDefinition[] = [
    { name: 'Developer', cta: 'Ambiente Teste', color: 'bg-gray-100 text-gray-800' },
    { name: 'Scale', cta: 'Comprar Scale', color: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-600 ring-offset-2' },
    { name: 'High Volume', cta: 'Falar com Arquitetos', color: 'bg-[#0A2540] text-white' },
    { name: 'Dedicated', cta: 'Preço sob consulta', color: 'bg-white text-[#0A2540] border border-[#0A2540]' }
];

const featuresDomine: FeatureCategory[] = [
    {
        category: "Webhooks e Infraestrutura", items: [
            { name: "Requisições por Mês", vals: ["10.000 (Soft Cap)", "100.000", "1.000.000+", "Customizado"] },
            { name: "Dead Letter Queue (Retries)", vals: ["3 dias", "7 dias", "14 dias", "Customizado"] },
            { name: "Ambiente do Banco de Dados", vals: ["Shared Edge", "Shared Edge", "Tenant Isolado", "Single Tenant (BYOC)"] },
            { name: "SLA de Infraestrutura", vals: ["Best Effort", "99.5%", "99.9%", "99.99%"] }
        ]
    },
    {
        category: "Agentes de IA e WhatsApp", items: [
            { name: "Tokens IA Inclusos", vals: ["1.000", "50.000", "500.000", "Ilimitado*"] },
            { name: "Recuperadores de Carrinho (WhatsApp)", vals: [false, true, true, true] },
            { name: "Alerta Ativo de Atrasos Logísticos", vals: [false, true, true, true] },
            { name: "Agente de SAC Multicanal", info: "Responde clientes lendo o histórico do CRM", vals: [false, false, true, true] }
        ]
    },
    {
        category: "Segurança e Conformidade", items: [
            { name: "Zero-Trust JWT Policies", vals: [true, true, true, true] },
            { name: "Sanitização de PII (Lei LGPD)", vals: [true, true, true, true] },
            { name: "Logs de Auditoria", vals: ["7 dias", "30 dias", "1 ano", "Armazenamento em Frio S3"] },
            { name: "SSO (SAML, OIDC)", vals: [false, false, true, true] }
        ]
    }
];
