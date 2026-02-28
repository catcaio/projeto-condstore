import { LayoutDashboard, BarChart3, Boxes, Package, Settings2, FileText, Activity, Users, Map, Calendar, DollarSign, BrainCircuit } from 'lucide-react';
import type { Module } from '@/ui/auth/entitlements-logic';

export type ModuleConfig = {
    id: string;
    label: string;
    group: string;
    icon: any;
    route: string;
    authModule: Module;
    isPlaceholder?: boolean;
};

export const MODULES: ModuleConfig[] = [
    // Core Group
    {
        id: "cockpit",
        label: "Dashboard",
        group: "Core",
        icon: LayoutDashboard,
        route: "/cockpit",
        authModule: "cockpit"
    },
    {
        id: "analytics",
        label: "Analytics",
        group: "Core",
        icon: BarChart3,
        route: "/cockpit/analytics",
        authModule: "cockpit"
    },
    {
        id: "knowledge",
        label: "Knowledge & AI",
        group: "Core",
        icon: BrainCircuit,
        route: "/cockpit/knowledge",
        authModule: "cockpit"
    },
    {
        id: "audit",
        label: "Audit Logs",
        group: "Core",
        icon: FileText,
        route: "/cockpit/audit",
        authModule: "audit"
    },

    // Operação Group
    {
        id: "dispatch",
        label: "Dispatch",
        group: "Operação",
        icon: Package,
        route: "/modules/dispatch",
        authModule: "dispatch",
        isPlaceholder: true
    },
    {
        id: "technicians",
        label: "Técnicos",
        group: "Operação",
        icon: Users,
        route: "/modules/technicians",
        authModule: "operation",
        isPlaceholder: true
    },
    {
        id: "routes",
        label: "Rotas",
        group: "Operação",
        icon: Map,
        route: "/modules/routes",
        authModule: "operation",
        isPlaceholder: true
    },
    {
        id: "events",
        label: "Eventos Logísticos",
        group: "Operação",
        icon: Calendar,
        route: "/modules/events",
        authModule: "operation",
        isPlaceholder: true
    },

    // Admin Group
    {
        id: "finance",
        label: "Financeiro",
        group: "Admin",
        icon: DollarSign,
        route: "/cockpit/finance",
        authModule: "admin",
        isPlaceholder: true
    },
    {
        id: "tenants",
        label: "Tenants",
        group: "Admin",
        icon: Boxes,
        route: "/cockpit/tenants",
        authModule: "admin",
        isPlaceholder: true
    },
    {
        id: "rate-limit",
        label: "Rate Limit",
        group: "Admin",
        icon: Activity,
        route: "/cockpit/rate-limit",
        authModule: "admin"
    },
    {
        id: "settings",
        label: "Configurações",
        group: "Admin",
        icon: Settings2,
        route: "/settings",
        authModule: "settings"
    }
];
