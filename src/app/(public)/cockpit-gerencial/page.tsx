import { Metadata } from 'next';
import { AppWindow, Users, ShieldCheck, ArrowRight, MousePointerClick, Gauge, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button } from '@/ui/components/button';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { CockpitShowcase, DragPulseEffect } from './cockpit.client';

export const metadata: Metadata = {
    title: 'Cockpit Operacional e Métricas | CONDSTORE OS',
    description: 'Acompanhe SLAs, exceções e métricas operacionais em tempo real. Visibilidade total para o gestor decidir com segurança.',
};

export default function CockpitLandingPage() {
    return (
        <div className="flex flex-col w-full os-root bg-white">
            <CockpitHero />
            <MetricsHighlight />
            <PersonalizationSection />
            <BottomCTA />
        </div>
    );
}

function CockpitHero() {
    return (
        <section className="relative w-full pt-32 pb-24 flex flex-col items-center overflow-hidden bg-gradient-to-b from-[#F2FBF6] to-[#F4F7FA]">
            <SectionTracker page="cockpit_publico" section="hero" />

            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-green-200 bg-white/50 backdrop-blur text-green-800 text-sm font-medium mb-10 shadow-sm">
                <Gauge className="w-4 h-4 text-green-600" />
                Operação em Tempo Real
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-[#0A2540] text-center max-w-5xl leading-[1.1] mb-8 px-6">
                Visibilidade para quem decide.
            </h1>

            <p className="text-xl md:text-2xl text-[#425466] text-center max-w-4xl font-light px-6 mb-12 leading-relaxed">
                O Cockpit do CONDSTORE OS transforma dados operacionais em ação. Acompanhe a saúde do seu atendimento, o status dos seus pedidos e a performance da sua logística em um painel único e personalizado.
            </p>

            <div className="w-full px-4">
                <CockpitShowcase />
            </div>
        </section>
    );
}

function MetricsHighlight() {
    return (
        <section className="py-24 bg-white">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-[#0A2540]">Gestão de Exceções</h3>
                        <p className="text-[#425466] text-sm">Identifique atrasos e bloqueios antes que o cliente reclame. O cockpit sinaliza o que precisa de atenção imediata.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-[#0A2540]">SLA de Atendimento</h3>
                        <p className="text-[#425466] text-sm">Visualize o tempo médio de resposta e a taxa de conversão do seu time de vendas no WhatsApp.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-[#0A2540]">Métricas de Frete</h3>
                        <p className="text-[#425466] text-sm">Analise prazos reais de entrega versus prometidos e identifique as transportadoras com melhor performance.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-[#0A2540]">Performance por Time</h3>
                        <p className="text-[#425466] text-sm">Dê visibilidade ao trabalho dos seus operadores, com rastro de decisão e volume de entregas por responsável.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function PersonalizationSection() {
    return (
        <section className="py-24 bg-[#0A2540] relative overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div className="order-2 md:order-1 relative">
                    <div className="absolute inset-0 bg-blue-500/10 blur-[50px] rounded-full"></div>
                    <div className="bg-[#112F4E] border border-gray-700 p-8 rounded-[40px] shadow-2xl relative">
                        <DragPulseEffect />
                        <div className="flex items-center justify-between pb-6 border-b border-gray-700 mb-6">
                            <h3 className="text-gray-300 font-medium flex items-center gap-2">
                                <MousePointerClick className="w-5 h-5" /> Fila de Ação
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <div className="h-12 bg-white/5 rounded-xl border border-white/10 flex items-center px-4 justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-red-500" />
                                    <span className="text-sm text-gray-300">Cotação Atrasada</span>
                                </div>
                                <span className="text-xs text-gray-500">2 min ago</span>
                            </div>
                            <div className="h-12 bg-white/5 rounded-xl border border-white/10 flex items-center px-4 justify-between opacity-60">
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="text-sm text-gray-300">Pedido Aprovado</span>
                                </div>
                                <span className="text-xs text-gray-500">15 min ago</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="order-1 md:order-2">
                    <h2 className="text-4xl font-extrabold text-white mb-6">O cockpit é o seu centro de decisão.</h2>
                    <p className="text-lg text-gray-300 mb-8 font-light">
                        Chega de sistemas burocráticos onde achar uma métrica leva 10 cliques. Com a interface inspirada em apps modernos, o gestor organiza os indicadores que mais importam para o dia a dia.
                    </p>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#112F4E] flex items-center justify-center shrink-0">
                                <AppWindow className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg">Apps Independentes</h4>
                                <p className="text-gray-400 text-sm">O Dashboard de Frete é um App. A Fila de Atendimento é um App. Abra o que precisa, quando precisar.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}

function BottomCTA() {
    return (
        <section className="py-24 bg-[#0A2540] text-center border-t border-white/10">
            <div className="max-w-4xl mx-auto px-6">
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Construa o centro de comando da sua operação</h2>
                <p className="text-xl text-gray-300 font-light mb-12">
                    Tenha visibilidade total, reduza o tempo de resposta e proteja sua margem com o cockpit operacional do CONDSTORE OS.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <TrackedLink href="/contato" trackPage="cockpit_publico" trackSection="footer" trackElement="cta_footer">
                        <Button className="h-14 px-8 rounded-full font-bold text-lg bg-[#00A859] hover:bg-[#008f4c] text-white shadow-xl shadow-[#00A859]/20 group">
                            Solicitar Avaliação Operacional
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </section>
    );
}
