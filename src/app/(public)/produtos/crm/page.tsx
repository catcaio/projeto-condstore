import { ArrowRight, BarChart3, Building2, CalendarRange, CheckCircle2, MessageCircle, Users, Shield, Bot } from 'lucide-react';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { Button } from '@/ui/components/button';
import { DataFlowWidget, Particles247 } from './crm-visuals.client';

export const metadata = {
    title: 'CRM Operacional | CONDSTORE OS',
    description: 'Centralize conversas de WhatsApp e contexto comercial em um cockpit unificado e supervisionado.',
};

export default function CRMProductPage() {
    return (
        <div className="flex flex-col w-full os-root bg-white">
            <HeroCRM />
            <FeatureHighlights />
            <Operations247 />
            <BottomCTA />
        </div>
    );
}

function HeroCRM() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-b from-[#F2FBF6] to-white pt-24 pb-32">
            <SectionTracker page="produtos_crm" section="hero" />

            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-sm font-semibold mb-8 shadow-sm">
                    <Building2 className="w-4 h-4" />
                    Operação B2B
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[#0A2540] max-w-4xl leading-[1.1] mb-8">
                    Centralize seu atendimento e acelere seu fluxo comercial
                </h1>

                <p className="text-xl text-[#425466] max-w-3xl font-light mb-12">
                    Pare de perder negociações por conversas dispersas ou falta de contexto. O CRM Operacional do CONDSTORE OS organiza seu atendimento via WhatsApp, mantém o histórico vivo e conecta cada conversa diretamente ao fluxo de cotação e pedido.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
                    <TrackedLink href="/contato" trackPage="produtos_crm" trackSection="hero" trackElement="hero_cta">
                        <Button className="w-full h-14 rounded-full font-bold text-lg bg-[#00A859] hover:bg-[#008f4c] text-white shadow-xl shadow-[#00A859]/20">
                            Solicitar Avaliação
                        </Button>
                    </TrackedLink>
                    <TrackedLink href="/como-funciona" trackPage="produtos_crm" trackSection="hero" trackElement="hero_secondary">
                        <Button variant="secondary" className="w-full h-14 rounded-full font-bold text-lg border-2 border-gray-200 text-[#425466] hover:bg-gray-50 bg-white">
                            Como Funciona
                        </Button>
                    </TrackedLink>
                </div>
            </div>

            <div className="mx-auto max-w-6xl mt-20 relative px-6">
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent z-10 bottom-0 h-48 mt-auto" />
                <img
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3"
                    alt="CRM Operacional Visão"
                    className="w-full h-auto rounded-[32px] shadow-2xl border border-gray-100 object-cover aspect-[21/9]"
                />
            </div>
        </section>
    );
}

function FeatureHighlights() {
    return (
        <section className="py-24 bg-white relative">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-[#00A859]" />
                        </div>
                        <h3 className="text-xl font-bold text-[#0A2540]">WhatsApp Centralizado</h3>
                        <p className="text-[#425466] text-sm">Fila única de atendimento com histórico preservado e identificação clara do cliente.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-[#0A2540]">Contexto Operacional</h3>
                        <p className="text-[#425466] text-sm">Visão 360° da negociação, conectando atendimento diretamente à cotação de frete.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                            <CalendarRange className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-[#0A2540]">Fila de Prioridade</h3>
                        <p className="text-[#425466] text-sm">Identificação automática de urgências e SLAs para garantir que nenhum pedido fique parado.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-[#0A2540]">Visibilidade para Gestão</h3>
                        <p className="text-[#425466] text-sm">Cockpit centralizado para acompanhar tempos de resposta, conversão e saúde da operação.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Operations247() {
    return (
        <section className="py-24 bg-[#0A2540] relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            <Particles247 />

            <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center gap-16">
                <div className="lg:w-1/2 flex flex-col items-start text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#112F4E] border border-gray-700 text-blue-300 text-sm font-semibold mb-8 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                        Operação Supervisionada
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
                        Sua operação com controle e rastro de decisão.
                    </h2>
                    <p className="text-lg text-gray-300 mb-8 font-light leading-relaxed">
                        No **CONDSTORE OS**, a tecnologia trabalha para o operador. O Frank atua como copiloto, organizando o contexto para que sua equipe decida com precisão e velocidade.
                    </p>
                    <ul className="flex flex-col gap-4 mb-10 w-full">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-6 h-6 text-[#00A859] shrink-0" />
                            <span className="text-gray-300">Centralização de conversas, cotações e pedidos em um rastro único e auditável.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Shield className="w-6 h-6 text-[#00A859] shrink-0" />
                            <span className="text-gray-300">Isolamento rigoroso por tenant e conformidade LGPD para segurança total dos dados.</span>
                        </li>
                    </ul>
                    <TrackedLink href="/produto" trackPage="produtos_crm" trackSection="operations_247" trackElement="learn_more_api">
                        <Button className="h-12 px-6 rounded-full font-bold text-base bg-white text-[#0A2540] hover:bg-gray-100 flex items-center gap-2">
                            Conheça o Produto
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </TrackedLink>
                </div>

                <div className="lg:w-1/2 w-full mt-12 lg:mt-0 relative group perspective-[1000px]">
                    <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
                    <div className="bg-[#112F4E] border border-gray-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden transform transition-all duration-500 group-hover:rotate-x-2 group-hover:rotate-y-2 group-hover:scale-[1.02]">
                        <div className="flex border-b border-gray-700 pb-4 mb-6 items-center justify-between">
                            <div className="text-gray-400 font-mono text-sm">terminal / operation-rastro</div>
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                            </div>
                        </div>
                        <div className="font-mono text-sm space-y-3 opacity-90">
                            <div className="flex gap-3 text-gray-400"><span className="text-purple-400">14:01:01</span> [CRM] Nova conversa via WhatsApp: Orçamento solicitado</div>
                            <div className="flex gap-3 text-gray-400"><span className="text-purple-400">14:01:05</span> [FRANK] Organizando contexto e histórico do cliente</div>
                            <div className="flex gap-3 text-green-400"><span className="text-purple-400">14:02:10</span> [OPERADOR] Iniciando cotação de frete multicarrier</div>
                            <div className="flex gap-3 text-gray-400"><span className="text-purple-400">14:03:15</span> [SISTEMA] Cotação gerada e vinculada ao atendimento</div>
                            <div className="flex gap-3 text-blue-400 font-bold"><span className="text-purple-400">14:04:20</span> [OPERADOR] Pedido aprovado e encaminhado para logística</div>
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
                <CheckCircle2 className="w-16 h-16 text-[#00A859] mx-auto mb-8" />
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Traga visibilidade e controle para sua operação B2B</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
                    <TrackedLink href="/contato" trackPage="produtos_crm" trackSection="footer" trackElement="footer_cta">
                        <Button className="h-14 px-8 rounded-full font-bold text-lg bg-[#00A859] hover:bg-[#008f4c] text-white shadow-xl shadow-[#00A859]/20 group">
                            Solicitar Demonstração
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </section>
    );
}
