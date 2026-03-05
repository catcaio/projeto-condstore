import { ArrowRight, Bot, Cpu, KeySquare, Network, ShieldAlert, Webhook } from 'lucide-react';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { Button } from '@/ui/components/button';

export const metadata = {
    title: 'Condstore DOMINE | IA & Motor de Eventos',
    description: 'Automatize o Caos. Agentes de IA e Webhooks dedicados para escalar sua operação sem contratar mais pessoas.',
};

export default function DomineProductPage() {
    return (
        <div className="flex flex-col w-full os-root bg-[#0A2540]">
            <HeroDomine />
            <TechnicalHighlights />
            <BottomCTA />
        </div>
    );
}

function HeroDomine() {
    return (
        <section className="relative overflow-hidden bg-[#0A2540] pt-24 pb-32">
            <SectionTracker page="produtos_domine" section="hero" />

            {/* Dark Mode Glow Mesh */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[150px] opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-600 rounded-full blur-[150px] opacity-10 pointer-events-none translate-y-1/2 -translate-x-1/2" />

            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center flex flex-col items-center relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold mb-8 shadow-sm">
                    <Bot className="w-4 h-4" />
                    Agentes de IA & DLQ
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-8">
                    Automação autônoma que resolve problemas antes do cliente notar
                </h1>

                <p className="text-xl text-blue-100/70 max-w-2xl font-light mb-12">
                    De Webhooks resilientes a mensagens de WhatsApp ativas. O motor DOMINE intercepta atrasos logísticos e atua ativamente para reduzir chargebacks.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
                    <TrackedLink href="/login" passHref trackPage="produtos_domine" trackSection="hero" trackElement="hero_cta" legacyBehavior>
                        <Button className="w-full h-14 rounded-full font-bold text-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20">
                            Falar com um Arquiteto
                        </Button>
                    </TrackedLink>
                    <TrackedLink href="/planos/domine" passHref trackPage="produtos_domine" trackSection="hero" trackElement="hero_secondary" legacyBehavior>
                        <Button variant="secondary" className="w-full h-14 rounded-full font-bold text-lg border-2 border-white/10 text-white hover:bg-white/5 bg-transparent">
                            Ver Infraestrutura
                        </Button>
                    </TrackedLink>
                </div>
            </div>

            <div className="mx-auto max-w-6xl mt-24 relative px-6 z-10">
                <div className="bg-[#112F4E] rounded-[32px] shadow-2xl border border-white/10 p-2">
                    <div className="bg-[#0A2540] rounded-[24px] border border-white/5 w-full aspect-[21/9] flex items-center justify-center relative overflow-hidden">
                        {/* Abstract Tech Visualization */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <Network className="w-96 h-96 text-indigo-400" />
                        </div>
                        <div className="z-20 flex flex-col items-center bg-white/5 backdrop-blur-md px-12 py-8 rounded-3xl border border-white/10">
                            <Cpu className="w-16 h-16 text-indigo-400 mb-6" />
                            <span className="text-2xl font-bold text-white tracking-widest font-mono">DOMINE V1.0 ACTIVE</span>
                            <span className="text-sm text-indigo-200 mt-2 font-mono">PROCESSING EVENT QUEUES</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function TechnicalHighlights() {
    return (
        <section className="py-24 bg-[#112F4E] relative border-t border-white/5">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white">Engenharia projetada para Escala</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                            <Webhook className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Webhooks c/ DLQ</h3>
                        <p className="text-blue-100/70 text-sm">Dead Letter Queues integradas garantem que nenhuma notificação de pedido ou transportadora seja perdida.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                            <Bot className="w-6 h-6 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Agentes WhatsApp</h3>
                        <p className="text-blue-100/70 text-sm">Assistentes autônomos que notificam clientes ativamente sobre atrasos (Correios) e resolvem Dúvidas Frequentes.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                            <ShieldAlert className="w-6 h-6 text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Rescue de Abandonos</h3>
                        <p className="text-blue-100/70 text-sm">Disparos conversacionais de alta conversão para resgatar vendas perdidas de boletos e Pix não pagos.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                            <KeySquare className="w-6 h-6 text-yellow-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Tokens Distribuídos</h3>
                        <p className="text-blue-100/70 text-sm">Autenticação Edge Zero-Trust. Criação de API Keys dedicadas e limitadas (Rate Limiting) por canal.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function BottomCTA() {
    return (
        <section className="py-32 bg-[#0A2540] text-center border-t border-white/5">
            <div className="max-w-4xl mx-auto px-6">
                <Network className="w-16 h-16 text-indigo-500 mx-auto mb-8" />
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Pronto para dar superpoderes ao seu Hub?</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
                    <TrackedLink href="/signup" passHref trackPage="produtos_domine" trackSection="footer" trackElement="footer_cta" legacyBehavior>
                        <Button className="h-14 px-8 rounded-full font-bold text-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 group">
                            Agendar Avaliação Técnica
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </section>
    );
}
