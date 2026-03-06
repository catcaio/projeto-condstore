'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Users, TrendingUp, HandCoins, Building2, Package, Truck,
    Headset, BarChart3, Database, Workflow, ShieldCheck, Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// --- DATA MODEL FOR SHELVES ---
type AppCard = {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
    href: string;
};

type Shelf = {
    id: string;
    title: string;
    description: string;
    apps: AppCard[];
};

const shelvesData: Shelf[] = [
    {
        id: 's1',
        title: 'Acquisition & Leads',
        description: 'Ferramentas de atração e gestão de pipeline.',
        apps: [
            { id: 'app1', title: 'CRM Connect', description: 'Pipeline B2B', icon: Users, colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10', href: '#' },
            { id: 'app2', title: 'RD Station Sync', description: 'Inbound Leads', icon: TrendingUp, colorClass: 'text-indigo-500', bgClass: 'bg-indigo-500/10', href: '#' },
            { id: 'app3', title: 'Meta Ads Data', description: 'ROI de Campanhas', icon: BarChart3, colorClass: 'text-purple-500', bgClass: 'bg-purple-500/10', href: '#' },
        ]
    },
    {
        id: 's2',
        title: 'Sales & Quoting',
        description: 'Conversão, precificação e fretes.',
        apps: [
            { id: 'app4', title: 'Cotação Rápida', description: 'Simulador B2B', icon: Truck, colorClass: 'text-orange-500', bgClass: 'bg-orange-500/10', href: '/cotacao' },
            { id: 'app5', title: 'Carrinhos Abandonados', description: 'Recuperação', icon: HandCoins, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10', href: '#' },
            { id: 'app6', title: 'Tabelas de Preço', description: 'Markup Dinâmico', icon: Database, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10', href: '#' },
        ]
    },
    {
        id: 's3',
        title: 'Financial (FinOps)',
        description: 'Controle de caixa, faturamento e inadimplência.',
        apps: [
            { id: 'app7', title: 'Faturamento Auto', description: 'NFe / Boletos', icon: Building2, colorClass: 'text-cyan-500', bgClass: 'bg-cyan-500/10', href: '#' },
            { id: 'app8', title: 'Conciliação Bancária', description: 'Itaú / Bradesco', icon: HandCoins, colorClass: 'text-teal-500', bgClass: 'bg-teal-500/10', href: '#' },
            { id: 'app9', title: 'Inadimplência', description: 'Régua de Cobrança', icon: Mail, colorClass: 'text-red-500', bgClass: 'bg-red-500/10', href: '#' },
        ]
    },
    {
        id: 's4',
        title: 'WMS & Inventory',
        description: 'Gestão de armazém e expedição.',
        apps: [
            { id: 'app10', title: 'Expedição WMS', description: 'Bipagem', icon: Package, colorClass: 'text-green-500', bgClass: 'bg-green-500/10', href: '#' },
            { id: 'app11', title: 'Etiquetas Smart', description: 'Impressão ZPL', icon: Workflow, colorClass: 'text-lime-500', bgClass: 'bg-lime-500/10', href: '#' },
            { id: 'app12', title: 'Controle de Estoque', description: 'Curva ABC', icon: Database, colorClass: 'text-emerald-600', bgClass: 'bg-emerald-600/10', href: '#' },
        ]
    },
    {
        id: 's5',
        title: 'Routing & Dispatch',
        description: 'Integrações de frete e rastreio.',
        apps: [
            { id: 'app13', title: 'Gateway Correios', description: 'Logística Reversa', icon: Truck, colorClass: 'text-yellow-500', bgClass: 'bg-yellow-500/10', href: '#' },
            { id: 'app14', title: 'Tracking Inteligente', description: 'Portal do Cliente', icon: TrendingUp, colorClass: 'text-blue-400', bgClass: 'bg-blue-400/10', href: '#' },
            { id: 'app15', title: 'Roteirizador', description: 'Frota Própria', icon: Workflow, colorClass: 'text-indigo-400', bgClass: 'bg-indigo-400/10', href: '#' },
        ]
    },
    {
        id: 's6',
        title: 'Customer Success',
        description: 'Pós-venda e retenção B2B.',
        apps: [
            { id: 'app16', title: 'Inbox Unificada', description: 'WhatsApp / Email', icon: Headset, colorClass: 'text-pink-500', bgClass: 'bg-pink-500/10', href: '#' },
            { id: 'app17', title: 'Alertas de Atraso', description: 'Prevenção de Churn', icon: ShieldCheck, colorClass: 'text-rose-500', bgClass: 'bg-rose-500/10', href: '#' },
        ]
    },
    {
        id: 's7',
        title: 'Analytics & Reports',
        description: 'BI Logístico avançado.',
        apps: [
            { id: 'app18', title: 'LTV & Cohorts', description: 'Lifetime Value', icon: BarChart3, colorClass: 'text-violet-500', bgClass: 'bg-violet-500/10', href: '#' },
            { id: 'app19', title: 'ROI de Fretes', description: 'Margem Líquida', icon: TrendingUp, colorClass: 'text-fuchsia-500', bgClass: 'bg-fuchsia-500/10', href: '#' },
        ]
    },
    {
        id: 's8',
        title: 'DOMINE Engine',
        description: 'Automação baseada em eventos.',
        apps: [
            { id: 'app20', title: 'Logs 24/7', description: 'Event Feed', icon: Database, colorClass: 'text-slate-500', bgClass: 'bg-slate-500/10', href: '#' },
            { id: 'app21', title: 'IA Triggers', description: 'Webhooks', icon: Workflow, colorClass: 'text-zinc-500', bgClass: 'bg-zinc-500/10', href: '#' },
        ]
    },
    {
        id: 's9',
        title: 'Integrations Hub',
        description: 'Parceiros Plug-and-Play.',
        apps: [
            { id: 'app22', title: 'ERP Sync', description: 'Bling, Tiny, SAP', icon: Workflow, colorClass: 'text-sky-500', bgClass: 'bg-sky-500/10', href: '/integracoes' },
        ]
    },
    {
        id: 's10',
        title: 'Settings & Security',
        description: 'Controle de acessos e configurações.',
        apps: [
            { id: 'app23', title: 'Delegação de Cargos', description: 'Gestão de Equipe', icon: ShieldCheck, colorClass: 'text-red-500', bgClass: 'bg-red-500/10', href: '/cockpit/equipe' },
            { id: 'app24', title: 'Permissões SALA', description: 'Role-Based Access', icon: Users, colorClass: 'text-orange-600', bgClass: 'bg-orange-600/10', href: '#' },
        ]
    }
];

export function CinematicShelves({ isTvMode }: { isTvMode: boolean }) {
    return (
        <div className="flex flex-col gap-10 sm:gap-14 pb-16 overflow-hidden w-full">
            {shelvesData.map((shelf) => (
                <ShelfRow key={shelf.id} shelf={shelf} isTvMode={isTvMode} />
            ))}
        </div>
    );
}

function ShelfRow({ shelf, isTvMode }: { shelf: Shelf, isTvMode: boolean }) {
    const constraintRef = useRef<HTMLDivElement>(null);

    return (
        <section className="flex flex-col gap-3 sm:gap-4 w-full">
            {/* Shelf Header */}
            <div className="px-4 sm:px-6 lg:px-8">
                <h2 className={cn("font-bold text-[hsl(var(--ui-text))] tracking-tight", isTvMode ? "text-3xl" : "text-xl sm:text-2xl")}>
                    {shelf.title}
                </h2>
                <p className={cn("text-[hsl(var(--ui-text-muted))]", isTvMode ? "text-lg" : "text-sm")}>
                    {shelf.description}
                </p>
            </div>

            {/* Draggable Carousel */}
            <div className="relative w-full overflow-hidden" ref={constraintRef}>
                <motion.div
                    drag="x"
                    dragConstraints={constraintRef}
                    dragElastic={0.15}
                    className="flex gap-4 px-4 sm:px-6 lg:px-8 w-max cursor-grab active:cursor-grabbing"
                    whileTap={{ cursor: "grabbing" }}
                >
                    {shelf.apps.map((app) => (
                        <AppPoster key={app.id} app={app} isTvMode={isTvMode} />
                    ))}
                    {/* Dummy padding at the end of the scroll */}
                    <div className="w-4 sm:w-8 shrink-0" />
                </motion.div>
            </div>
        </section>
    );
}

function AppPoster({ app, isTvMode }: { app: AppCard, isTvMode: boolean }) {
    return (
        <Link href={app.href} draggable={false} className="block group shrink-0">
            <div className={cn(
                "relative flex flex-col justify-end p-5 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm transition-all duration-300",
                "hover:-translate-y-2 hover:shadow-xl hover:border-[hsl(var(--ui-accent-blue)/0.4)] overflow-hidden",
                isTvMode ? "w-72 h-44" : "w-52 h-40 sm:w-60 sm:h-44"
            )}>
                {/* Background Accent Gradient */}
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity", app.bgClass)} />

                {/* Icon Floating */}
                <div className={cn("absolute top-4 right-4 flex items-center justify-center rounded-xl p-3 shadow-inner", app.bgClass)}>
                    <app.icon className={cn("w-6 h-6", app.colorClass)} />
                </div>

                <div className="relative z-10 flex flex-col gap-1">
                    <h3 className={cn("font-bold text-[hsl(var(--ui-text))] leading-tight", isTvMode ? "text-2xl" : "text-lg")}>
                        {app.title}
                    </h3>
                    <p className={cn("text-[hsl(var(--ui-text-muted))]", isTvMode ? "text-base" : "text-xs")}>
                        {app.description}
                    </p>
                </div>
            </div>
        </Link>
    );
}
