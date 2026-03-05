'use client';

import { motion } from 'framer-motion';
import { Layers, Terminal, ArrowRight, Server, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/ui/components';
import { TrackedLink } from '@/ui/lib/track-client';

export function PlataformaClient() {
    return (
        <div className="w-full relative z-10 pt-24 sm:pt-32 pb-24">
            {/* HERO SECTION */}
            <section className="max-w-7xl mx-auto px-6 mb-24 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-6 block">CONDSTORE OS PLATAFORMA</span>
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#0A2540] tracking-tight leading-tight max-w-5xl mx-auto mb-8">
                        Crie sua operação: use o <span className="text-blue-600">Cockpit</span> ou vá de <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Headless</span>.
                    </h1>
                    <p className="text-xl text-[#425466] max-w-3xl mx-auto mb-10 leading-relaxed">
                        Quer começar estruturando sua logística do zero ou está procurando integrar APIs avulsas no seu ERP? Sem problemas! O Condstore OS tem a camada ideal para o seu negócio B2B.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <TrackedLink href="/signup" passHref trackPage="plataforma" trackSection="hero" trackElement="signup_cta" legacyBehavior>
                            <Button className="h-14 px-8 rounded-full font-bold text-lg bg-[#0A2540] hover:bg-[#112F4E] text-white shadow-xl group">
                                Começar Gratuitamente
                            </Button>
                        </TrackedLink>
                        <TrackedLink href="/docs" passHref trackPage="plataforma" trackSection="hero" trackElement="docs_cta" legacyBehavior>
                            <Button variant="ghost" className="h-14 px-8 rounded-full font-bold text-lg text-[#0A2540] hover:bg-[#0A2540]/5 group">
                                Ler a Documentação
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </TrackedLink>
                    </div>
                </motion.div>
            </section>

            {/* SPLIT CHOICE SECTION */}
            <section className="bg-white py-24 border-y border-[hsl(var(--ui-border))]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-extrabold text-[#0A2540] mb-6">Escolha como você deseja operar</h2>
                        <p className="text-lg text-[#425466] max-w-2xl mx-auto">
                            A mesma infraestrutura Serverless Edge, duas formas de consumir. Integre-se à nossa malha de serviços da forma que a sua equipe técnica preferir.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                        {/* OPÇÃO 1: COCKPIT */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="bg-[#F6F9FC] rounded-3xl p-10 border border-[#E2E8F0] shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 transition-transform group-hover:scale-110"></div>
                            <Layers className="w-12 h-12 text-blue-600 mb-8 relative z-10" />
                            <h3 className="text-2xl sm:text-3xl font-bold text-[#0A2540] mb-4 relative z-10">Comece usando o Cockpit</h3>
                            <p className="text-[#425466] mb-8 leading-relaxed relative z-10">
                                Gestão B2B e Logística de Fretes prontas para o uso. Uma interface inspirada em operações de alto volume (como iFood e Uber Eats), com <strong className="text-[#0A2540]">painéis modulares</strong> configuráveis por setor da sua empresa.
                            </p>
                            <ul className="space-y-4 mb-10 relative z-10">
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                    </div>
                                    <span className="text-[#425466] font-medium">App Launcher com fixação de módulos ("Pins").</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                    </div>
                                    <span className="text-[#425466] font-medium">Dashboards visuais para rastreio de frota (Marciano).</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                    </div>
                                    <span className="text-[#425466] font-medium">Sem necessidade de codificação no front-end.</span>
                                </li>
                            </ul>
                            <TrackedLink href="/cockpit" passHref trackPage="plataforma" trackSection="split" trackElement="cockpit_link" legacyBehavior>
                                <a className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors relative z-10">
                                    Explorar o Cockpit <ArrowRight className="ml-2 w-4 h-4" />
                                </a>
                            </TrackedLink>
                        </motion.div>

                        {/* OPÇÃO 2: HEADLESS API */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="bg-[#0A2540] rounded-3xl p-10 shadow-sm hover:shadow-2xl transition-shadow relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-900 rounded-full blur-3xl opacity-40 -mr-20 -mt-20 transition-transform group-hover:scale-110"></div>
                            <Terminal className="w-12 h-12 text-indigo-400 mb-8 relative z-10" />
                            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 relative z-10">Crie de forma personalizada (Headless)</h3>
                            <p className="text-slate-300 mb-8 leading-relaxed relative z-10">
                                Utilize nosso motor <strong className="text-white">DOMINE Intake v1</strong> recebendo eventos de despacho diretamente no seu ERP atual. Adote a abordagem headless e integre APIs robustas e Webhooks globais à sua própria pilha de tecnologia.
                            </p>
                            <ul className="space-y-4 mb-10 relative z-10">
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center mr-3 mt-0.5">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                                    </div>
                                    <span className="text-slate-300 font-medium">APIs Serverless no Vercel Edge para menor latência ({`<`} 50ms).</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center mr-3 mt-0.5">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                                    </div>
                                    <span className="text-slate-300 font-medium">DLQ (Dead Letter Queue) automatizado para resiliência.</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center mr-3 mt-0.5">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                                    </div>
                                    <span className="text-slate-300 font-medium">Controle absoluto sob a experiência do seu cliente final.</span>
                                </li>
                            </ul>
                            <TrackedLink href="/docs/api" passHref trackPage="plataforma" trackSection="split" trackElement="api_link" legacyBehavior>
                                <a className="inline-flex items-center text-indigo-400 font-bold hover:text-indigo-300 transition-colors relative z-10">
                                    Ler Documentação da API <ArrowRight className="ml-2 w-4 h-4" />
                                </a>
                            </TrackedLink>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* DEEP DIVE TECH SECTION (HEADLESS FOCUS) */}
            <section className="bg-slate-50 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-16">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0A2540] mb-4">Escolha sua própria pilha de tecnologia</h2>
                        <p className="text-lg text-[#425466] max-w-3xl">Quer construir algo novo? É só começar. Nossas APIs aguentam grandes demandas.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <Server className="w-8 h-8 text-blue-600 mb-6" />
                            <h3 className="text-xl font-bold text-[#0A2540] mb-3">APIs robustas na Borda (Edge)</h3>
                            <p className="text-[#425466] text-sm leading-relaxed mb-6">
                                Implementadas globalmente via Vercel Edge Network, as APIs do Condstore processam milhares de consultas de fretes e pipelines B2B para que clientes carreguem cotações com total rapidez.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <Zap className="w-8 h-8 text-amber-500 mb-6" />
                            <h3 className="text-xl font-bold text-[#0A2540] mb-3">Motor Event-Driven (DOMINE)</h3>
                            <p className="text-[#425466] text-sm leading-relaxed mb-6">
                                Acelere o recebimento de atualizações de frota via Webhooks resilientes. O envio de eventos para nosso cluster processa lógicas pesadas de faturamento e romaneios em background.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <ShieldCheck className="w-8 h-8 text-emerald-600 mb-6" />
                            <h3 className="text-xl font-bold text-[#0A2540] mb-3">Segurança e TiDB Serverless</h3>
                            <p className="text-[#425466] text-sm leading-relaxed mb-6">
                                Seja para isolar Tenant Data, escalar sem limite de conexões (TiDB) ou bloquear bots maliciosos (Rate Limiting). Seu parceiro de infraestrutura B2B é seguro e confiável.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

