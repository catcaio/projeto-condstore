import { ArrowRight, Box, CheckCircle2, ShieldCheck, Truck, Zap } from 'lucide-react';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { Button } from '@/ui/components/button';
import { RoiCalculator } from '@/ui/components/roi-calculator';

export const metadata = {
    title: 'CONDSTORE Envios | Gateway de Fretes Multicarrier',
    description: 'Centralize cotações de frete e integre as maiores transportadoras em um fluxo operacional único.',
};

export default function EnviosProductPage() {
    return (
        <div className="flex flex-col w-full os-root bg-white">
            <HeroEnvios />
            <FeatureHighlights />
            <RoiCalculator />
            <BottomCTA />
        </div>
    );
}

function HeroEnvios() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F7FA] to-white pt-24 pb-32">
            <SectionTracker page="produtos_envios" section="hero" />

            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-8 shadow-sm">
                    <Truck className="w-4 h-4" />
                    Gateway Logístico Zero-Touch
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[#0A2540] max-w-4xl leading-[1.1] mb-8">
                    Cotação de frete ágil e integrada à sua operação
                </h1>

                <p className="text-xl text-[#425466] max-w-2xl font-light mb-12">
                    Conectamos sua operação aos Correios e transportadoras privadas. Simulações rápidas e integradas ao fluxo de pedido e cockpit operacional.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
                    <TrackedLink href="/login" trackPage="produtos_envios" trackSection="hero" trackElement="hero_cta">
                        <Button className="w-full h-14 rounded-full font-bold text-lg bg-[#0A2540] hover:bg-[#112F4E] text-white shadow-xl shadow-[#0A2540]/20">
                            Criar Conta Grátis
                        </Button>
                    </TrackedLink>
                    <TrackedLink href="/planos/envios" trackPage="produtos_envios" trackSection="hero" trackElement="hero_secondary">
                        <Button variant="secondary" className="w-full h-14 rounded-full font-bold text-lg border-2 border-gray-200 text-[#425466] hover:bg-gray-50 bg-white">
                            Ver Preços
                        </Button>
                    </TrackedLink>
                </div>
            </div>

            {/* Visual Decorative Dashboard Mockup inspired by Olist */}
            <div className="mx-auto max-w-5xl mt-20 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent z-10 bottom-0 h-32 mt-auto" />
                <div className="bg-white rounded-[32px] shadow-2xl border border-gray-100 p-2 overflow-hidden transform -rotate-1 md:-rotate-2 hover:rotate-0 transition-transform duration-700">
                    <div className="bg-[#F8FAFC] rounded-[24px] border border-gray-100 w-full aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                        {/* Fake Dashboard Grid */}
                        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-4 p-8 opacity-40">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 col-span-1 row-span-1" />
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 col-span-1 row-span-1" />
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 col-span-2 row-span-2" />
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 col-span-2 row-span-1" />
                        </div>
                        <div className="z-20 flex flex-col items-center bg-white/80 backdrop-blur px-8 py-6 rounded-3xl shadow-lg border border-white/50">
                            <Truck className="w-12 h-12 text-blue-600 mb-4" />
                            <span className="text-xl font-bold text-[#0A2540]">Dashboard Envios. Hub Central.</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FeatureHighlights() {
    return (
        <section className="py-24 bg-white relative">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#0A2540]">Cotações em 50ms</h3>
                        <p className="text-[#425466]">Seu cliente não espera. Nossa API Edge calcula o frete de 10 transportadoras instantaneamente no checkout.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#0A2540]">Gerador de Etiquetas</h3>
                        <p className="text-[#425466]">Transforme pedidos em etiquetas ZPL prontas para Zebra em 1 clique. Esqueça o copia e cola do ERP.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#0A2540]">Rastreio Homologado LGPD</h3>
                        <p className="text-[#425466]">Páginas de rastreio blindadas. Seus clientes acompanham o pedido sem vazamento de dados pessoais ou CEP.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function BottomCTA() {
    return (
        <section className="py-24 bg-[#0A2540] text-center">
            <div className="max-w-4xl mx-auto px-6">
                <Box className="w-16 h-16 text-blue-400 mx-auto mb-8" />
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Pronto para economizar?</h2>
                <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto font-light">
                    Integre sua loja virtual hoje. Leva apenas 3 minutos. Não pedimos cartão de crédito.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <TrackedLink href="/login" trackPage="produtos_envios" trackSection="footer" trackElement="footer_cta">
                        <Button className="h-14 px-8 rounded-full font-bold text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 group">
                            Criar Conta Grátis
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </section>
    );
}
