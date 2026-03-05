'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Building2, CheckCircle, Package, Receipt, Truck } from 'lucide-react';
import { Button } from '@/ui/components/button';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { PricingTable, PlanDefinition, FeatureCategory } from '@/ui/components/marketing/pricing-table';

export default function PricingCRMPage() {
    return (
        <div className="flex flex-col items-center w-full os-root bg-[#F4F7FA] overflow-hidden">
            <CRMPricingHero />
            <PricingTable
                title="Tudo sobre as funcionalidades de cada plano do Condstore CRM"
                planos={planosCRM}
                features={featuresCRM}
            />
            <FinalCTA />
        </div>
    );
}

function CRMPricingHero() {
    return (
        <section className="relative w-full pt-32 pb-24 flex flex-col items-center overflow-hidden bg-gradient-to-b from-[#F2FBF6] to-[#F4F7FA]">
            <SectionTracker page="pricing_crm" section="hero" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-green-200 bg-white/50 backdrop-blur text-green-800 text-sm font-medium mb-10 shadow-sm"
            >
                <Building2 className="w-4 h-4 text-green-600" />
                VendaMais B2B
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-[72px] font-extrabold tracking-[-0.04em] text-[#0A2540] text-center max-w-4xl leading-[1.1] mb-8"
            >
                Planos flexíveis para automação logística da sua receita Enterprise
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl md:text-2xl text-[#425466] text-center font-light mb-12 z-10"
            >
                Escolha a camada de inteligência e automação de Pipeline B2B adequada para o seu estágio atual. Escale limites com segurança quando o seu atacado começar a tracionar de verdade com sincronia WMS/ERP.
            </motion.p>

            {/* Pipeline Sync Widget */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl z-10"
            >
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-blue-200 rounded-full blur-md"></motion.div>
                        <Receipt className="w-5 h-5 text-blue-600 relative z-10" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 mt-2">ORÇAMENTO</span>
                </div>

                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                </motion.div>

                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center relative">
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} className="absolute inset-0 bg-green-200 rounded-full blur-md"></motion.div>
                        <CheckCircle className="w-5 h-5 text-green-600 relative z-10" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 mt-2">PAGAMENTO</span>
                </div>

                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}>
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                </motion.div>

                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center relative">
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2, delay: 1.2 }} className="absolute inset-0 bg-purple-200 rounded-full blur-md"></motion.div>
                        <Package className="w-5 h-5 text-purple-600 relative z-10" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 mt-2">SEPARAÇÃO</span>
                </div>

                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 2, delay: 1.2 }}>
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                </motion.div>

                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center relative">
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2, delay: 1.8 }} className="absolute inset-0 bg-orange-200 rounded-full blur-md"></motion.div>
                        <Truck className="w-5 h-5 text-orange-600 relative z-10" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 mt-2">RASTREIO</span>
                </div>
            </motion.div>
        </section>
    );
}

function FinalCTA() {
    return (
        <div className="w-full max-w-7xl mx-auto px-6 mb-24 relative z-10 -mt-10">
            <div className="p-12 bg-gradient-to-r from-[#00A859] to-[#0A2540] rounded-[40px] shadow-2xl flex flex-col items-center text-center">
                <h2 className="text-4xl font-extrabold text-white mb-6">Traga previsibilidade comercial para o seu atacado</h2>
                <TrackedLink href="/signup" passHref trackPage="pricing_crm" trackSection="footer" trackElement="cta_footer" legacyBehavior>
                    <Button className="bg-white text-[#0A2540] hover:bg-gray-50 h-14 px-10 rounded-full font-bold text-lg shadow-xl shadow-green-900/20 group">
                        Crie sua conta no CRM
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </TrackedLink>
            </div>
        </div>
    );
}

const planosCRM: PlanDefinition[] = [
    { name: 'Free', cta: 'Começar Grátis', color: 'bg-gray-100 text-gray-800' },
    { name: 'Basic', cta: 'Teste grátis', color: 'bg-[#00A859] text-white shadow-lg shadow-green-600/30 ring-2 ring-green-600 ring-offset-2' },
    { name: 'Pro', cta: 'Falar com Vendas', color: 'bg-[#0A2540] text-white hover:bg-[#112F4E]' },
    { name: 'Advanced', cta: 'Falar com Vendas', color: 'bg-white text-[#0A2540] border border-[#0A2540]' }
];

const featuresCRM: FeatureCategory[] = [
    {
        category: "Gestão Básica e Usuários", items: [
            { name: "Usuários Inclusos", vals: ["Até 3", "Até 10", "Até 50", "Ilimitado"] },
            { name: "Funis de Vendas", vals: ["1", "Múltiplos", "Múltiplos", "Múltiplos + Grupos"] },
            { name: "Suporte", vals: ["Comunidade", "Email/Chat", "Prioritário", "Gerente de CS"] }
        ]
    },
    {
        category: "Funcionalidades de Vendas B2B", items: [
            { name: "Gestão Atacadista (CNPJ)", vals: [true, true, true, true] },
            { name: "Integração WhatsApp", vals: [false, true, true, true] },
            { name: "Disparo em Massa", vals: [false, false, true, true] },
            { name: "Catálogo e Orçamentos", vals: [false, true, true, true] }
        ]
    },
    {
        category: "Inteligência e Relatórios", items: [
            { name: "Metas de Vendedores", vals: [false, true, true, true] },
            { name: "Relatório de Follow-up", info: "Controle de tempo de interação com leads", vals: [false, true, true, true] },
            { name: "Automações Complexas", vals: [false, false, true, true] },
            { name: "Exportação de Dados API", vals: [false, false, true, true] }
        ]
    }
];
