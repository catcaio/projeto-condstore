'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Shield, LayoutDashboard, Users, Truck, Activity, Link as LinkIcon, ArrowRight, Github, GitCommit } from 'lucide-react';
import { EvolutionData } from '@/lib/git-evolution';

interface FrontStatus {
  id: string;
  name: string;
  description: string;
  status: string;
  percentage: number;
  reasoning: string;
}

const iconsMap: Record<string, React.ElementType> = {
  auth: Shield,
  cockpit: LayoutDashboard,
  tenant: Users,
  freight: Truck,
  observability: Activity,
  integration: LinkIcon
};

const colorsMap: Record<string, string> = {
  auth: 'bg-emerald-500',
  cockpit: 'bg-indigo-500',
  tenant: 'bg-violet-500',
  freight: 'bg-amber-500',
  observability: 'bg-rose-500',
  integration: 'bg-cyan-500'
};

const textColorsMap: Record<string, string> = {
  auth: 'text-emerald-400',
  cockpit: 'text-indigo-400',
  tenant: 'text-violet-400',
  freight: 'text-amber-400',
  observability: 'text-rose-400',
  integration: 'text-cyan-400'
};

export default function ShowcaseClient({
  evolutionData,
  frontsStatus
}: {
  evolutionData: EvolutionData;
  frontsStatus: FrontStatus[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <section className="min-h-[70vh] flex flex-col items-center justify-center text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8"
          >
            O motor operacional <br className="hidden md:block"/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">
              para a nova era logística
            </span>
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a href="#modulos" className="px-8 py-4 rounded-lg bg-white text-slate-950 font-medium hover:bg-slate-200 transition-colors">
              Explorar Módulos <ArrowRight className="w-4 h-4 inline-block" />
            </a>
          </motion.div>
        </section>

        <section id="modulos" className="py-24 scroll-mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Matriz de Funcionalidades</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {frontsStatus.map((front, index) => {
              const Icon = iconsMap[front.id] || LayoutDashboard;
              const barColor = colorsMap[front.id] || 'bg-slate-500';
              const textColor = textColorsMap[front.id] || 'text-slate-400';
              
              return (
                <motion.div
                  key={front.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group relative p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <Icon className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-950 border border-slate-800 rounded">{front.status}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{front.name}</h3>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm"><span className="text-slate-300">Progresso</span><span className={textColor}>{front.percentage}%</span></div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full"><motion.div initial={{ width: 0 }} whileInView={{ width: `${front.percentage}%` }} viewport={{ once: true }} className={`h-full rounded-full ${barColor}`} /></div>
                    <p className="text-xs text-slate-500 pt-2">{front.reasoning}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section id="evolucao" className="py-24 border-t border-slate-800/50 scroll-mt-24">
           <div className="mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Pulso do Repositório</h2>
          </div>
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800">
            <div className="h-[300px] w-full flex items-end justify-between gap-2 overflow-x-auto pb-6 relative">
              {evolutionData.timeline.map((point, index) => {
                const maxTotal = Math.max(...evolutionData.timeline.map(t => t.total), 1);
                const heightPercent = Math.max(5, (point.total / maxTotal) * 100);
                return (
                  <div key={point.date} className="flex-1 min-w-[30px] flex flex-col items-center justify-end gap-2 group relative z-10">
                    <motion.div 
                      className="w-full max-w-[40px] rounded-t-sm"
                      style={{ height: `${heightPercent}%`, backgroundColor: '#4f46e5' }}
                      initial={{ opacity: 0, height: 0 }}
                      whileInView={{ opacity: 1, height: `${heightPercent}%` }}
                      viewport={{ once: true }}
                    />
                    <span className="text-[10px] text-slate-500 rotate-[-45deg] origin-top-left -ml-2 translate-y-2">{point.date}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-12 pt-8 border-t border-slate-800">
              {evolutionData.latestCommits.map((commit, i) => (
                <div key={i} className="flex items-center gap-4 text-sm px-4 py-2 hover:bg-slate-800/30 rounded-lg">
                  <span className="text-slate-500 font-mono text-xs">{commit.date}</span>
                  <span className="text-slate-300 truncate">{commit.message}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
