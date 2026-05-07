import { ArrowRight, Box, CheckCircle2, ShieldCheck, Truck, Zap, Package, Calculator, Gauge } from 'lucide-react';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { Button } from '@/ui/components/button';
import { RoiCalculator } from '@/ui/components/roi-calculator';

export const metadata = {
    title: 'Logística e Pedidos | CONDSTORE OS',
    description: 'Gerencie cotações de frete, pedidos e shipments em um fluxo único e rastreável.',
};

export default function LogisticaProductPage() {
    return (
        <div className="flex flex-col w-full os-root bg-white">
            <HeroLogistica />
            <FeatureHighlights />
            <WorkflowSection />
            <RoiCalculator />
            <BottomCTA />
        </div>
    );
}

function HeroLogistica() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F7FA] to-white pt-24 pb-32">
            <SectionTracker page="logistica_publica" section="hero" />

            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-8 shadow-sm">
                    <Truck className="w-4 h-4" />
                    Cotação + Pedido + Logística
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[#0A2540] max-w-4xl leading-[1.1] mb-8">
                    Deixe a planilha para trás. Domine sua execução.
                </h1>

                <p className="text-xl text-[#425466] max-w-3xl font-light mb-12">
                    Conecte cotações de frete multicarrier diretamente à geração de pedidos e acompanhamento de shipments. No CONDSTORE OS, a logística não é um silo — ela é a continuidade natural da sua venda.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
                    <TrackedLink href="/contato" trackPage="logistica_publica" trackSection="hero" trackElement="hero_cta">
                        <Button className="w-full h-14 rounded-full font-bold text-lg bg-[#0A2540] hover:bg-[#112F4E] text-white shadow-xl shadow-[#0A2540]/20">
                            Falar com Especialista
                        </Button>
                    </TrackedLink>
                    <TrackedLink href="/como-funciona" trackPage="logistica_publica" trackSection="hero" trackElement="hero_secondary">
                        <Button variant="secondary" className="w-full h-14 rounded-full font-bold text-lg border-2 border-gray-200 text-[#425466] hover:bg-gray-50 bg-white">
                            Como Funciona
                        </Button>
                    </TrackedLink>
                </div>
            </div>

            <div className="mx-auto max-w-5xl mt-20 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent z-10 bottom-0 h-32 mt-auto" />
                <div className="bg-white rounded-[32px] shadow-2xl border border-gray-100 p-2 overflow-hidden transform -rotate-1 md:-rotate-2 hover:rotate-0 transition-transform duration-700">
                    <div className="bg-[#F8FAFC] rounded-[24px] border border-gray-100 w-full aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-4 p-8 opacity-40">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 col-span-1 row-span-1" />
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 col-span-1 row-span-1" />
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 col-span-2 row-span-2" />
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 col-span-2 row-span-1" />
                        </div>
                        <div className="z-20 flex flex-col items-center bg-white/80 backdrop-blur px-8 py-6 rounded-3xl shadow-lg border border-white/50">
                            <Package className="w-12 h-12 text-blue-600 mb-4" />
                            <span className="text-xl font-bold text-[#0A2540]">Gestão de Pedidos e Shipments</span>
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
                            <Calculator className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#0A2540]">Cotação Multicarrier</h3>
                        <p className="text-[#425466]">Compare fretes dos Correios e transportadoras privadas instantaneamente, com regras de margem e critérios operacionais definidos.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                            <Package className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#0A2540]">Gestão de Pedidos</h3>
                        <p className="text-[#425466]">Aprovação operacional vira pedido com responsável, timeline de estado e handoff automático para a expedição.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#0A2540]">Shipments Rastreados</h3>
                        <p className="text-[#425466]">Acompanhamento em tempo real do status de entrega. Exceções e atrasos são sinalizados automaticamente no seu cockpit.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function WorkflowSection() {
    return (
        <section className="py-24 bg-[#F8FAFC]">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex flex-col md:flex-row gap-16 items-center">
                    <div className="md:w-1/2">
                        <h2 className="text-4xl font-extrabold text-[#0A2540] mb-6">Visibilidade de ponta a ponta.</h2>
                        <p className="text-lg text-[#425466] mb-8 font-light">
                            O segredo de uma operação eficiente não é apenas a velocidade, mas a clareza de estado. No CONDSTORE OS, cada etapa da logística alimenta o cockpit gerencial.
                        </p>
                        <ul className="space-y-4">
                            {[
                                'Cotação vinculada ao atendimento (WhatsApp).',
                                'Pedidos com rastro de decisão e aprovação humana.',
                                'Timeline de shipment auditável por tenant.',
                                'Tratamento de exceções centralizado.',
                            ].map((item) => (
                                <li key={item} className="flex items-center gap-3 text-[#425466]">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="md:w-1/2 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">1</div>
                            <div>
                                <h4 className="font-bold text-[#0A2540]">Cotação Aprovada</h4>
                                <p className="text-sm text-gray-500">Operador valida a melhor opção no fluxo.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">2</div>
                            <div>
                                <h4 className="font-bold text-[#0A2540]">Pedido Gerado</h4>
                                <p className="text-sm text-gray-500">O sistema cria o registro com rastro completo.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">3</div>
                            <div>
                                <h4 className="font-bold text-[#0A2540]">Execução Logística</h4>
                                <p className="text-sm text-gray-500">Shipment em trânsito e visível no cockpit.</p>
                            </div>
                        </div>
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
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Pronto para profissionalizar sua logística?</h2>
                <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto font-light">
                    Reduza o retrabalho e tenha controle total sobre seus envios e pedidos hoje mesmo.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <TrackedLink href="/contato" trackPage="logistica_publica" trackSection="footer" trackElement="footer_cta">
                        <Button className="h-14 px-8 rounded-full font-bold text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 group">
                            Solicitar Avaliação Operacional
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </section>
    );
}
