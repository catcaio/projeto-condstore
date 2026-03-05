'use client';

import { motion } from 'framer-motion';
import { Database, Server, Cpu, Layers, Activity } from 'lucide-react';
import { SectionTracker } from '@/ui/lib/track-client';



export default function TechnologyPage() {
    return (
        <div className="flex flex-col w-full os-root bg-[#111111] text-gray-300">
            <TechHero />
            <ArchitectureDiagram />
            <TechGrid />
        </div>
    );
}

function TechHero() {
    return (
        <section className="relative overflow-hidden pt-32 pb-20 border-b border-gray-800">
            <SectionTracker page="tecnologias" section="hero" />
            <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-700 bg-gray-900 text-gray-400 text-xs font-mono mb-8">
                    <Cpu className="w-3 h-3" />
                    /architecture
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8">
                    Desenhado para o <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Pior Cenário.</span>
                </h1>

                <p className="text-xl leading-relaxed font-light max-w-3xl mx-auto text-gray-400">
                    O varejo não avisa quando terá picos de tráfego. Construímos o Condstore OS em cima do Next.js Edge Runtime e TiDB Serverless: persistência escalável e computação de baixa latência (P99 50ms).
                </p>
            </div>
        </section>
    );
}

function ArchitectureDiagram() {
    return (
        <section className="py-24 bg-black relative">
            <div className="mx-auto max-w-6xl px-6">
                <div className="bg-gray-900 rounded-[32px] border border-gray-800 p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]" />

                    <h2 className="text-2xl font-bold text-white mb-12 flex items-center gap-3">
                        <Layers className="text-blue-500" />
                        Stack Zero-Touch
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                        <div className="bg-black/50 border border-gray-800 p-6 rounded-2xl flex flex-col items-center text-center">
                            <Server className="w-10 h-10 text-emerald-500 mb-4" />
                            <h3 className="font-bold text-white text-lg">Vercel Edge Network</h3>
                            <p className="text-sm text-gray-400 mt-2">Computação distribuída. Regras de rotas logísticas avaliadas em ms perto do usuário.</p>
                        </div>
                        <div className="bg-black/50 border border-gray-800 p-6 rounded-2xl flex flex-col items-center text-center">
                            <Database className="w-10 h-10 text-blue-500 mb-4" />
                            <h3 className="font-bold text-white text-lg">TiDB Serverless (MySQL)</h3>
                            <p className="text-sm text-gray-400 mt-2">Banco de dados HTAP que escala infraestrutura automaticamente ("Scale-to-Zero").</p>
                        </div>
                        <div className="bg-black/50 border border-gray-800 p-6 rounded-2xl flex flex-col items-center text-center">
                            <Activity className="w-10 h-10 text-indigo-500 mb-4" />
                            <h3 className="font-bold text-white text-lg">DOMINE Event Processor</h3>
                            <p className="text-sm text-gray-400 mt-2">Motor de Fila / Dead Letter via poller contínuo assíncrono para garantir entrega de Webhooks.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function TechGrid() {
    return (
        <section className="py-24 border-t border-gray-800">
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-4">Pilar 1: Resiliência em Picos (Black Friday)</h3>
                        <p className="text-gray-400 leading-relaxed text-sm">
                            Em e-commerces, o tráfego é log-normal e os picos destroem arquiteturas legadas. Utilizando serverless nativo, o Cockpit e as APIs públicas de rastreio mantêm o SLA independente da volumetria, eliminando a necessidade de instâncias dedicadas aguardando tráfego.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-4">Pilar 2: Arquitetura Orientada a Eventos</h3>
                        <p className="text-gray-400 leading-relaxed text-sm">
                            O padrão Publish-Subscribe do DOMINE atrela todos os domínios da aplicação sem acoplamento severo (Micro-Frontend). Quando um pacote é escaneado em São Paulo, o evento aciona faturamento, SMS, Dashboard do Lojista e ML Model de Risk Checkers — tudo desacoplado.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
