import { Metadata } from 'next';
import { AppWindow, Users, ShieldCheck, ArrowRight, MousePointerClick } from 'lucide-react';
import { Button } from '@/ui/components/button';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { CockpitShowcase, DragPulseEffect } from './cockpit.client';

export const metadata: Metadata = {
    title: 'Workspace B2B Customizado | Condstore OS',
    description: 'Um hub único e personalizado para toda a sua operação B2B. Do estoquista ao Diretor, cada usuário visualiza apenas os aplicativos que precisa.',
};

export default function CockpitLandingPage() {
    return (
        <div className="flex flex-col w-full os-root bg-white">
            <CockpitHero />
            <PersonalizationSection />
            <SecuritySilosSection />
            <BottomCTA />
        </div>
    );
}

function CockpitHero() {
    return (
        <section className="relative w-full pt-32 pb-0 flex flex-col items-center overflow-hidden bg-gradient-to-b from-[#F2FBF6] to-[#F4F7FA]">
            <SectionTracker page="plataforma_cockpit" section="hero" />

            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-green-200 bg-white/50 backdrop-blur text-green-800 text-sm font-medium mb-10 shadow-sm">
                <AppWindow className="w-4 h-4 text-green-600" />
                SALA Role-Based Workspace
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-[#0A2540] text-center max-w-5xl leading-[1.1] mb-8 px-6">
                Um ecossistema, telas infinitas.
            </h1>

            <p className="text-xl md:text-2xl text-[#425466] text-center max-w-4xl font-light px-6 mb-12 leading-relaxed">
                Esqueça dezenas de logins espalhados em sistemas que não se conversam. O **Condstore OS** centraliza sua operação através de "Mini-Apps". Do separador de caixas ao Diretor Executivo, cada um tem o seu próprio universo de apps — **sem cobranças de licença adicionais**.
            </p>

            <div className="w-full px-4">
                <CockpitShowcase />
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
                                <MousePointerClick className="w-5 h-5" /> Arraste e Organize
                            </h3>
                        </div>

                        <div className="grid grid-cols-3 gap-6 opacity-60">
                            <div className="aspect-square border-2 border-dashed border-gray-600 rounded-2xl"></div>
                            <div className="aspect-square border-2 border-dashed border-gray-600 rounded-2xl"></div>
                            <div className="aspect-square border-2 border-dashed border-gray-600 rounded-2xl"></div>
                            <div className="aspect-square border-2 border-dashed border-gray-600 rounded-2xl"></div>
                            <div className="aspect-square border-2 border-dashed border-gray-600 rounded-2xl"></div>
                            <div className="aspect-square border-2 border-dashed border-gray-600 rounded-2xl"></div>
                        </div>
                    </div>
                </div>

                <div className="order-1 md:order-2">
                    <h2 className="text-4xl font-extrabold text-white mb-6">A Área de Trabalho é sua.</h2>
                    <p className="text-lg text-gray-300 mb-8 font-light">
                        Chega de sistemas burocráticos onde achar uma função leva 10 cliques. Com a interface inspirada em Smartphones, o usuário arrasta, solta e favoritar os módulos como se fossem aplicativos no seu Desktop.
                    </p>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#112F4E] flex items-center justify-center shrink-0">
                                <AppWindow className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg">Apps Independentes</h4>
                                <p className="text-gray-400 text-sm">O Cotação Fácil é um App. O CRM é um App. A Agenda é um App. Abra juntos ou separados.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}

function SecuritySilosSection() {
    return (
        <section className="py-24 bg-white">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-extrabold text-[#0A2540] mb-6 max-w-2xl">
                    Controle Nível Empresa. Execução Nível Smartphone.
                </h2>
                <p className="text-[#425466] max-w-3xl mb-12">
                    Ao criar um novo cargo através da engine SALA (Sectors, Access, Layers, Applications), você define exatamente quais "Apps" aquele cargo pode ver. Um operador de armazém não verá os boletos da empresa, e um vendedor externo não verá o inventário de embalagens do armazém.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                        <Users className="w-8 h-8 text-blue-500 mb-4" />
                        <h4 className="font-bold text-[#0A2540] mb-2">Onboarding em Minutos</h4>
                        <p className="text-sm text-gray-500">A equipe não precisa aprender o "ERP Inteiro". Eles só veem os 2 ou 3 ícones da tarefa deles.</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                        <ShieldCheck className="w-8 h-8 text-green-500 mb-4" />
                        <h4 className="font-bold text-[#0A2540] mb-2">Segurança Zero-Trust</h4>
                        <p className="text-sm text-gray-500">Se o app não está na tela do usuário, o servidor não libera acesso na API. Risco zero de vazamento interno.</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                        <AppWindow className="w-8 h-8 text-purple-500 mb-4" />
                        <h4 className="font-bold text-[#0A2540] mb-2">Longe da Complexidade</h4>
                        <p className="text-sm text-gray-500">Cada "App" Logístico é focado em fazer 1 coisa perfeitamente bem. Menos botões, mais ação.</p>
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
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Construa o ecossistema da sua empresa</h2>
                <p className="text-xl text-gray-300 font-light mb-12">
                    Faça do faturamento à expedição um processo fluído e escalável, sem os bloqueios dos sistemas engessados.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <TrackedLink href="/signup" passHref trackPage="plataforma_cockpit" trackSection="footer" trackElement="cta_footer" legacyBehavior>
                        <Button className="h-14 px-8 rounded-full font-bold text-lg bg-[#00A859] hover:bg-[#008f4c] text-white shadow-xl shadow-[#00A859]/20 group">
                            Criar Conta e Personalizar Apps
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </section>
    );
}
