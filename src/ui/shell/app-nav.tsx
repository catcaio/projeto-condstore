'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    LayoutDashboard,
    ShoppingCart,
    FileText,
    Users,
    Truck,
    Package,
    Navigation,
    BarChart3,
    Inbox,
    ListChecks,
    DollarSign,
    TrendingUp,
    Heart,
    Server,
    AlertTriangle,
    ScrollText,
    ShieldAlert,
    Menu,
    X,
    ChevronRight,
} from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        title: '',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        ],
    },
    {
        title: 'VENDAS',
        items: [
            { label: 'Nova Cotação', href: '/vendas/cotacao', icon: ShoppingCart },
            { label: 'Pedidos', href: '/vendas/pedidos', icon: FileText },
            { label: 'Clientes', href: '/vendas/clientes', icon: Users },
        ],
    },
    {
        title: 'LOGÍSTICA',
        items: [
            { label: 'Simulador', href: '/logistica/simulador', icon: Truck },
            { label: 'Envios', href: '/logistica/envios', icon: Package },
            { label: 'Tabelas de Frete', href: '/logistica/tabelas-frete', icon: FileText },
            { label: 'Rastreamento', href: '/logistica/rastreamento', icon: Navigation },
            { label: 'Insights', href: '/logistica/insights', icon: BarChart3 },
        ],
    },
    {
        title: 'OPERAÇÃO',
        items: [
            { label: 'Inbox', href: '/operacao/inbox', icon: Inbox },
            { label: 'Fila', href: '/operacao/fila', icon: ListChecks },
        ],
    },
    {
        title: 'FINANCEIRO',
        items: [
            { label: 'Custos de Frete', href: '/financeiro/frete', icon: DollarSign },
            { label: 'Margem', href: '/financeiro/margem', icon: TrendingUp },
        ],
    },
    {
        title: 'SISTEMA',
        items: [
            { label: 'Health', href: '/sistema/health', icon: Heart },
            { label: 'DLQ', href: '/sistema/dlq', icon: AlertTriangle },
            { label: 'Logs', href: '/sistema/logs', icon: ScrollText },
            { label: 'Security', href: '/sistema/security', icon: ShieldAlert },
        ],
    },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

    return (
        <Link
            href={item.href}
            className={`
                group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
                transition-all duration-150 relative
                ${isActive
                    ? 'bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]'
                    : 'text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-bg)/0.6)]'
                }
            `}
        >
            {/* Active indicator bar */}
            {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[hsl(var(--ui-accent-blue))]" />
            )}
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[hsl(var(--ui-accent-blue))]' : 'text-[hsl(var(--ui-text-muted))] group-hover:text-[hsl(var(--ui-text))]'}`} />
            <span className="truncate">{item.label}</span>
            {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
        </Link>
    );
}

export function AppNav({ role, tenantId }: { role: string; tenantId: string | null }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navContent = (
        <nav className="flex flex-col gap-5">
            {NAV_GROUPS.map((group, gi) => (
                <div key={gi}>
                    {group.title && (
                        <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-muted)/0.6)]">
                            {group.title}
                        </p>
                    )}
                    <div className="flex flex-col gap-0.5">
                        {group.items.map((item) => (
                            <NavLink key={item.href} item={item} pathname={pathname} />
                        ))}
                    </div>
                </div>
            ))}
        </nav>
    );

    return (
        <>
            {/* Desktop nav */}
            <div className="hidden md:block">
                {navContent}
            </div>

            {/* Mobile toggle + overlay */}
            <div className="md:hidden">
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    Menu
                </button>
                {mobileOpen && (
                    <div className="mt-2" onClick={() => setMobileOpen(false)}>
                        {navContent}
                    </div>
                )}
            </div>
        </>
    );
}
