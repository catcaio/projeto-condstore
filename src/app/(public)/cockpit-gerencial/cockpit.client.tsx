'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { LayoutDashboard, Users, BarChart3, Package, Truck, Receipt, Settings, Bell, Headset, Wallet } from 'lucide-react';

type AppModule = {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
};

const allApps: Record<string, AppModule> = {
    crm: { id: 'crm', name: 'CRM Connect', icon: Users, color: 'bg-blue-500' },
    wms: { id: 'wms', name: 'WMS Expedição', icon: Package, color: 'bg-green-500' },
    freight: { id: 'freight', name: 'Cotação & Frete', icon: Truck, color: 'bg-orange-500' },
    finance: { id: 'finance', name: 'Financeiro B2B', icon: Wallet, color: 'bg-purple-500' },
    reports: { id: 'reports', name: 'Cockpit Analytics', icon: BarChart3, color: 'bg-indigo-500' },
    support: { id: 'support', name: 'Pós-Venda (SAC)', icon: Headset, color: 'bg-pink-500' },
    billing: { id: 'billing', name: 'Faturamento', icon: Receipt, color: 'bg-teal-500' },
    settings: { id: 'settings', name: 'Configurações', icon: Settings, color: 'bg-gray-600' },
};

const roleProfiles = {
    'diretor': {
        label: 'Diretor (Visão Total)',
        apps: ['reports', 'finance', 'crm', 'wms', 'freight', 'billing', 'support', 'settings']
    },
    'vendedor': {
        label: 'Representante / Vendedor',
        apps: ['crm', 'freight', 'support']
    },
    'estoquista': {
        label: 'Operador Logístico',
        apps: ['wms', 'freight']
    }
};

export function CockpitShowcase() {
    const [activeRole, setActiveRole] = useState<keyof typeof roleProfiles>('diretor');

    const currentApps = roleProfiles[activeRole].apps.map(appId => allApps[appId]);

    return (
        <div className="w-full max-w-5xl mx-auto mt-16 flex flex-col items-center">
            {/* Role Selectors */}
            <div className="flex flex-wrap justify-center gap-3 mb-8 md:mb-12 px-4">
                {(Object.keys(roleProfiles) as Array<keyof typeof roleProfiles>).map((role) => (
                    <button
                        key={role}
                        onClick={() => setActiveRole(role)}
                        className={`px-4 md:px-6 py-2 md:py-3 rounded-full text-xs md:text-sm font-bold transition-all duration-300 border-2 ${activeRole === role
                            ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-xl scale-105'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                            }`}
                    >
                        {roleProfiles[role].label}
                    </button>
                ))}
            </div>

            {/* Simulated Desktop Window */}
            <div className="w-full bg-[#F4F7FA] rounded-t-3xl border-t border-l border-r border-gray-200 overflow-hidden shadow-2xl relative min-h-[500px]">
                {/* Mac Window Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" /> CONDSTORE OS
                    </div>
                    <div className="flex items-center gap-4 text-gray-400">
                        <Bell className="w-4 h-4" />
                        <div className="w-6 h-6 rounded-full bg-gray-200 border border-gray-300"></div>
                    </div>
                </div>

                {/* App Grid inside the window */}
                <div className="p-6 md:p-10">
                    <motion.div
                        layout
                        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 md:gap-8 justify-items-center"
                    >
                        <AnimatePresence mode="popLayout">
                            {currentApps.map((app) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                    key={app.id}
                                    className="flex flex-col items-center gap-3 w-24 group"
                                >
                                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${app.color} flex items-center justify-center text-white shadow-lg cursor-pointer transform transition-transform group-hover:-translate-y-2 group-hover:shadow-xl`}>
                                        <app.icon className="w-6 h-6 md:w-8 md:h-8" />
                                    </div>
                                    <span className="text-[10px] md:text-xs font-semibold text-center text-gray-600 leading-tight">
                                        {app.name}
                                    </span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export function DragPulseEffect() {
    return (
        <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl flex flex-col items-center justify-center gap-2 text-white shadow-2xl absolute -right-4 -top-12 z-20 cursor-grab active:cursor-grabbing"
        >
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg">
                <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-bold">Frete</span>
        </motion.div>
    );
}
