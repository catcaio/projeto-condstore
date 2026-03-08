import { Metadata } from 'next';
import Link from 'next/link';
import { LayoutDashboard, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Dashboard — CONDSTORE OS',
    description: 'Visão geral operacional do sistema',
};

const QUICK_LINKS = [
    { label: 'Simulador de Frete', href: '/logistica/simulador', color: 'blue' },
    { label: 'Envios', href: '/logistica/envios', color: 'emerald' },
    { label: 'Rastreamento', href: '/logistica/rastreamento', color: 'amber' },
    { label: 'Insights', href: '/logistica/insights', color: 'violet' },
    { label: 'Inbox', href: '/operacao/inbox', color: 'sky' },
    { label: 'Health', href: '/sistema/health', color: 'rose' },
];

export default function DashboardPage() {
    return (
        <main className="p-6 md:p-8 max-w-[1100px] mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <LayoutDashboard className="w-6 h-6 text-[hsl(var(--ui-accent-blue))]" />
                <div>
                    <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight">Dashboard</h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Visão geral operacional</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {QUICK_LINKS.map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="group rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5 flex items-center justify-between hover:border-[hsl(var(--ui-accent-blue)/0.3)] hover:shadow-sm transition-all"
                    >
                        <span className="text-sm font-semibold text-[hsl(var(--ui-text))] group-hover:text-[hsl(var(--ui-accent-blue))] transition-colors">
                            {link.label}
                        </span>
                        <ArrowRight className="w-4 h-4 text-[hsl(var(--ui-text-muted))] group-hover:text-[hsl(var(--ui-accent-blue))] group-hover:translate-x-0.5 transition-all" />
                    </Link>
                ))}
            </div>
        </main>
    );
}
