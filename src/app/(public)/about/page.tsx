'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, GitBranch, Cpu, TerminalSquare, ArrowRight } from 'lucide-react';
import { SectionTracker, TrackedLink } from '@/ui/lib/track-client';
import { Button } from '@/ui/components/button';

export default function AboutPage() {
    return (
        <div className="flex flex-col w-full os-root bg-white">
            <HeroManifesto />
            <PrinciplesSection />
            <TimelineSection />
            <FinalMissionCTA />
        </div>
    );
}

function HeroManifesto() {
    return (
        <section className="relative overflow-hidden pt-24 pb-32">
            <SectionTracker page="about" section="hero" />
            <div className="mx-auto max-w-5xl px-6 lg:px-8 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-600 text-xs font-mono uppercase tracking-widest mb-8">
                    <TerminalSquare className="w-3 h-3" />
                    condstore_os // manifesto da engenharia
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[#0A2540] mb-8 leading-[1.05]">
                    A logística não é um problema de transporte. <br className="hidden md:block" />
                    <span className="text-blue-600">É um problema de software.</span>
                </h1>

                <p className="text-xl md:text-2xl text-[#425466] leading-relaxed font-light max-w-3xl">
                    O varejo digital brasileiro roda em cima de integrações frágeis, ERPs monolíticos e planilhas instáveis. Construímos o Condstore OS porque a escala verdadeira exige uma infraestrutura "Zero-Touch".
                </p>
            </div>
        </section>
    );
}

function PrinciplesSection() {
    return (
        <section className="py-24 bg-[#F4F7FA]">
            <div className="mx-auto max-w-5xl px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
                    <div className="flex flex-col gap-4 border-t border-gray-200 pt-8">
                        <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                            <Cpu className="h-5 w-5" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-[#0A2540]">
                            Decisão Computacional, Não Humana.
                        </h3>
                        <p className="text-[#425466] leading-relaxed">
                            Sua equipe de SAC e Logística não deve calcular margens de frete via UTM ou decidir qual transportadora usar por região. Nós roteamos as regras de negócio em milissegundos na Edge, isolando seus operadores da falibilidade mecânica.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-gray-200 pt-8">
                        <div className="h-10 w-10 rounded bg-green-100 flex items-center justify-center text-green-600">
                            <GitBranch className="h-5 w-5" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-[#0A2540]">
                            Desacoplamento de Integrações
                        </h3>
                        <p className="text-[#425466] leading-relaxed">
                            Abstraímos o estado caótico das transportadoras brasileiras atrás de uma única API REST/Webhook idempotente. Se o webservice da transportadora cair, nossa camada de resiliência e failover assume a volumetria, garantindo que seu checkout nunca pare.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-gray-200 pt-8 md:col-span-2">
                        <div className="h-10 w-10 rounded bg-purple-100 flex items-center justify-center text-purple-600">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-[#0A2540]">
                            Estado Unificado e Observabilidade Total
                        </h3>
                        <p className="text-[#425466] leading-relaxed max-w-3xl">
                            Acreditamos que todo pacote deve ter uma telemetria exata, desde a simulação do carrinho até a entrega final. Integrando CAC, Retorno de AdSpend e custo logístico em um único Data Lake Automático, a caixa preta da frota nacional se torna matematicamente transparente para C-Levels.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function TimelineSection() {
    const timelineEvents = [
        { year: "2018", title: "A Gênese do Caos", description: "Vimos de perto o colapso de centenas de lojistas por conta do apagão logístico nacional. O ecossistema de transporte brasileiro era um monólito impossível de prever." },
        { year: "2020", title: "O Desacoplamento", description: "Lançamos a primeira versão do Gateway que abstraía os Correios. Se a API pública caísse, o checkout do nosso lojista continuava funcionando graças ao Edge Caching." },
        { year: "2023", title: "Arquitetura Zero-Touch", description: "Matamos todas as intervenções manuais. O surgimento do motor DOMINE inaugurou a capacidade de roteirizar fretes por IA antes de qualquer decisão humana." },
        { year: "Hoje", title: "O Condstore OS", description: "Evoluímos de um Gateway para um Sistema Operacional Web3-Ready, controlando desde CRM B2B até Webhooks em tempo real e Agentes Autônomos de WhatsApp." }
    ];

    return (
        <section className="py-32 bg-white">
            <div className="mx-auto max-w-5xl px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-extrabold text-[#0A2540]">Evolução do Ecossistema Logístico</h2>
                </div>

                <div className="relative border-l border-gray-200 ml-4 md:mx-auto md:w-full max-w-3xl">
                    {timelineEvents.map((event, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="mb-12 ml-8 relative"
                        >
                            <span className="absolute -left-10 w-4 h-4 rounded-full bg-blue-600 border-4 border-white top-1 shadow-sm" />
                            <h3 className="text-2xl font-bold text-blue-600 mb-2">{event.year}</h3>
                            <h4 className="text-xl font-bold text-[#0A2540] mb-2">{event.title}</h4>
                            <p className="text-[#425466] leading-relaxed">{event.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FinalMissionCTA() {
    return (
        <section className="py-24 bg-[#0A2540] text-center">
            <div className="mx-auto max-w-3xl px-6">
                <h2 className="text-4xl font-extrabold text-white mb-6">Venha construir a logística do futuro</h2>
                <p className="text-xl text-blue-100/70 mb-10 max-w-2xl mx-auto font-light">
                    Você quer operar seu e-commerce com tecnologia de "Bilion-Dollar Company"?
                    Nós construímos a infra. Você domina o seu mercado.
                </p>
                <div className="flex justify-center gap-4">
                    <TrackedLink href="/signup" passHref trackPage="about" trackSection="footer" trackElement="cta_footer" legacyBehavior>
                        <Button className="h-14 px-8 rounded-full font-bold text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 group">
                            Crie sua conta agora
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </section>
    );
}
