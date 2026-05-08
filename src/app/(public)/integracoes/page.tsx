import { Metadata } from 'next';
import { Truck, CreditCard, ArrowRight, Server, ShieldCheck, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/ui/components/button';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { InteractiveIntegrationsGrid } from './integracoes.client';

export const metadata: Metadata = {
    title: 'Integrações B2B Enterprise | CONDSTORE OS',
    description: 'Conecte as APIs do seu Banco e Transportadoras diretamente ao WMS. Sem intermediários, sem margens ocultas.',
};

export default function IntegracoesPage() {
    return (
        <div className="flex flex-col w-full os-root bg-[#F4F7FA]">
            <HeroIntegracoes />
            <DirectAPIFeature />
            <IntegrationsGrid />
            <BottomCTA />
        </div>
    );
}

function HeroIntegracoes() {
    return (
        <section className="relative w-full pt-32 pb-24 flex flex-col items-center overflow-hidden bg-white">
            <SectionTracker page="integracoes" section="hero" />

            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-sm font-semibold mb-8 shadow-sm">
                <LinkIcon className="w-4 h-4 text-blue-600" />
                Hub de Integrações B2B
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-[#0A2540] text-center max-w-4xl leading-[1.1] mb-8 px-6">
                Sua logística com Integração Direta e Margem Líquida.
            </h1>

            <p className="text-xl md:text-2xl text-[#425466] text-center max-w-3xl font-light px-6 mb-12 leading-relaxed">
                As plataformas genéricas (como Melhor Envio ou Kangu) lucram em cima do seu frete. O **CONDSTORE OS** conecta você *diretamente* às APIs dos Grandes Bancos e Transportadoras Brasileiras. **Use seu próprio contrato. Proteja sua margem B2B.**
            </p>
        </section>
    );
}

function DirectAPIFeature() {
    return (
        <section className="py-24 bg-[#0A2540] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-900/30 to-transparent skew-x-12 transform origin-top" />

            <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div>
                    <h2 className="text-4xl font-extrabold text-white mb-6">A Vantagem da API Própria</h2>
                    <p className="text-lg text-gray-300 mb-8 font-light">
                        Atacadistas não podem depender de tabelas variáveis de Marketplaces de Frete. Nós desenvolvemos **Gateways Nativos** para você despachar suas cargas Enterprise utilizando sua própria Tabela Balcão e Prazo.
                    </p>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#112F4E] flex items-center justify-center shrink-0">
                                <Truck className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg">Transportadoras Enterprise</h4>
                                <p className="text-gray-400 text-sm">Cálculo e Roteirização via API direta de players massivos (Braspress, Jadlog, Correios Contrato).</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#112F4E] flex items-center justify-center shrink-0">
                                <CreditCard className="w-5 h-5 text-[#00A859]" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg">Bancos e SPLIT B2B</h4>
                                <p className="text-gray-400 text-sm">Emita boletos e faça conciliação automática ligada ao seu CNPJ matriz (Itaú, Bradesco, Cora).</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#112F4E] flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg">Segurança Zero-Trust</h4>
                                <p className="text-gray-400 text-sm">Suas credenciais de contrato são transitadas sob criptografia em movimento via TiDB Serverless.</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="bg-[#112F4E] p-8 rounded-3xl border border-gray-700 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-700">
                        <Server className="text-gray-400 w-6 h-6" />
                        <h3 className="text-white font-mono text-lg">CONDSTORE API Matrix</h3>
                    </div>
                    <div className="space-y-4 font-mono text-sm opacity-90">
                        <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-3 text-gray-300">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div> Braspress API
                            </div>
                            <span className="text-green-400">Connected 4ms</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-3 text-gray-300">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div> Itaú Cash Management
                            </div>
                            <span className="text-green-400">Connected 12ms</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-3 text-gray-300">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div> Correios SIGEP
                            </div>
                            <span className="text-green-400">Connected 8ms</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function IntegrationsGrid() {
    return (
        <section className="py-24 bg-[#F4F7FA] border-t border-gray-100 text-center">
            <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-3xl font-bold text-[#0A2540] mb-12">Ecossistema Conectado Pronto Para Uso</h2>
                <InteractiveIntegrationsGrid />
            </div>
        </section>
    );
}

function BottomCTA() {
    return (
        <section className="py-24 bg-[#F4F7FA] text-center">
            <div className="max-w-4xl mx-auto px-6">
                <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-full mb-8">
                    <CheckCircle2 className="w-8 h-8 text-[#00A859]" />
                </div>
                <h2 className="text-4xl font-extrabold text-[#0A2540] mb-6">Assuma o controle da sua logística B2B</h2>
                <div className="flex justify-center gap-4 mt-8">
                    <TrackedLink href="/signup" passHref trackPage="integracoes" trackSection="footer" trackElement="cta_signup" legacyBehavior>
                        <Button className="h-14 px-8 rounded-full font-bold text-lg bg-[#00A859] hover:bg-[#008f4c] text-white shadow-xl shadow-[#00A859]/20 group">
                            Criar Conta e Conectar
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </section>
    );
}
