'use client';

import { motion } from 'framer-motion';
import { AlertOctagon, TrendingDown, Clock, SearchX, ShieldCheck } from 'lucide-react';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { Button } from '@/ui/components/button';

export const metadata = {
    title: 'Gargalos Logísticos do Brasil | LojaCond',
    description: 'Entenda os problemas crônicos da infraestrutura de logística nacional e como a tecnologia resolve o caos.',
};

export default function LogisticsBottlenecksPage() {
    return (
        <div className="flex flex-col w-full os-root bg-white">
            <HeroBottlenecks />
            <InfographicSection />
            <SolutionSection />
        </div>
    );
}

function HeroBottlenecks() {
    return (
        <section className="bg-gradient-to-b from-[#FFF2F2] to-white pt-24 pb-16">
            <SectionTracker page="gargalos_logisticos" section="hero" />
            <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-700 text-sm font-semibold mb-8 shadow-sm">
                    <AlertOctagon className="w-4 h-4" />
                    O Maior Custo Oculto do E-commerce
                </div>

                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-[#0A2540] mb-6 leading-[1.1]">
                    A Logística Brasileira é <span className="text-red-600">Caótica.</span>
                </h1>

                <p className="text-xl text-[#425466] leading-relaxed font-light max-w-2xl">
                    A dependência crônica do sistema rodoviário, tributações complexas (ICMS, DIFAL) e a fragmentação do Last Mile matam a margem de lucro de e-commerces promissores todos os dias.
                </p>
            </div>
        </section>
    );
}

function InfographicSection() {
    const dataPoints = [
        {
            icon: TrendingDown,
            color: "text-red-600",
            bg: "bg-red-50",
            title: "Custo Logístico Desafiador",
            stat: "12% a 15%",
            desc: "Do faturamento bruto de um e-commerce nacional é consumido apenas pelo frete, reduzindo drasticamente o LTV."
        },
        {
            icon: Clock,
            color: "text-orange-600",
            bg: "bg-orange-50",
            title: "Fator 'Last Mile'",
            stat: "53%",
            desc: "Dos custos totais de frete estão concentrados na última milha. Atrasos operacionais ocorrem frequentemente nas últimas 24h da jornada."
        },
        {
            icon: SearchX,
            color: "text-yellow-600",
            bg: "bg-yellow-50",
            title: "Visibilidade Zero",
            stat: "1 em 4",
            desc: "Pacotes sofrem algum tipo de inconsistência de rastreio, gerando ansiedade no cliente final e explodindo os tickets de suporte (SAC)."
        }
    ];

    return (
        <section className="py-16 bg-white relative">
            <div className="mx-auto max-w-6xl px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {dataPoints.map((dp, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.1 }}
                            className="flex flex-col items-center text-center p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
                        >
                            <div className={`w-16 h-16 rounded-full ${dp.bg} flex items-center justify-center mb-6`}>
                                <dp.icon className={`w-8 h-8 ${dp.color}`} />
                            </div>
                            <span className={`text-4xl font-extrabold ${dp.color} mb-2`}>{dp.stat}</span>
                            <h3 className="text-xl font-bold text-[#0A2540] mb-4">{dp.title}</h3>
                            <p className="text-[#425466] leading-relaxed text-sm">{dp.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function SolutionSection() {
    return (
        <section className="py-24 bg-[#0A2540] text-center mt-12">
            <div className="mx-auto max-w-4xl px-6">
                <ShieldCheck className="w-16 h-16 text-blue-400 mx-auto mb-8" />
                <h2 className="text-4xl font-extrabold text-white mb-6">Como o Condstore OS anula esse risco?</h2>
                <p className="text-xl text-blue-100/70 mb-10 max-w-2xl mx-auto font-light">
                    Não consertamos as estradas do Brasil. Nós construímos o software que blinda você delas.
                    Roteirização autônoma, failover dinâmico de transportadoras e rastreio de ponta-a-ponta acoplado ao seu SAC.
                </p>
                <div className="flex justify-center gap-4">
                    <TrackedLink href="/produtos/envios" passHref trackPage="gargalos_logisticos" trackSection="solution" trackElement="cta_solution" legacyBehavior>
                        <Button className="h-14 px-8 rounded-full font-bold text-lg bg-blue-600 hover:bg-blue-500 text-white">
                            Conheça o Hub Condstore
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </section>
    );
}
