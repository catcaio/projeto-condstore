import { LayoutDashboard, BarChart3, Boxes, Package, Settings2, FileText, Activity, Users, Map, Calendar, DollarSign, BrainCircuit } from 'lucide-react';
import type { Module, Role } from '@/ui/auth/entitlements-logic';

export type RouteDefinition = {
    pattern: string;
    title: string;
    guard?: {
        roles?: Role[];
        plan?: "free" | "pro" | "domine" | null;
    };
};

export type ModuleConfig = {
    id: string;
    label: string;
    group: string;
    icon: any;
    route: string; // The primary route (link in navbar)
    authModule: Module;
    requiredRoles?: Role[]; // If undefined, any role can access (but might be blocked by canAccess logic)
    requiredPlan?: "free" | "pro" | "domine" | null; // Just for UI hint or stricter checks
    navVisible: boolean;
    isPlaceholder?: boolean;
    routes: RouteDefinition[]; // Array of routes within this module
};

export const MODULES: ModuleConfig[] = [
    // Core Group
    {
        id: "cockpit",
        label: "Dashboard",
        group: "Core",
        icon: LayoutDashboard,
        route: "/cockpit",
        authModule: "cockpit",
        navVisible: true,
        routes: [
            { pattern: "/cockpit", title: "DASHBOARD" }
        ],
    },
    {
        id: "analytics",
        label: "Analytics",
        group: "Core",
        icon: BarChart3,
        route: "/cockpit/analytics",
        authModule: "cockpit",
        navVisible: true,
        routes: [
            { pattern: "/cockpit/analytics", title: "ANALYTICS" }
        ],
    },
    {
        id: "knowledge",
        label: "Knowledge & AI",
        group: "Core",
        icon: BrainCircuit,
        route: "/cockpit/knowledge",
        authModule: "cockpit",
        navVisible: true,
        routes: [
            { pattern: "/cockpit/knowledge", title: "KNOWLEDGE BASE" },
            { pattern: "/cockpit/knowledge/collections", title: "COLEÇÕES" },
            { pattern: "/cockpit/knowledge/ask", title: "FRANK ASK" },
            { pattern: "/cockpit/knowledge/documents/:docId/versions/:versionId/chunks/:chunkId", title: "CHUNK VIEWER" },
        ],
    },
    {
        id: "audit",
        label: "Audit Logs",
        group: "Core",
        icon: FileText,
        route: "/cockpit/audit",
        authModule: "audit",
        requiredRoles: ["admin", "manager", "operator"],
        navVisible: true,
        routes: [
            { pattern: "/cockpit/audit", title: "AUDITORIA" }
        ]
    },

    // Operação Group
    {
        id: "dispatch",
        label: "Dispatch",
        group: "Operação",
        icon: Package,
        route: "/modules/dispatch",
        authModule: "dispatch",
        requiredRoles: ["admin", "manager", "operator"],
        requiredPlan: "pro",
        navVisible: true,
        isPlaceholder: true,
        routes: [
            { pattern: "/modules/dispatch", title: "DISPATCH" }
        ]
    },
    {
        id: "technicians",
        label: "Técnicos",
        group: "Operação",
        icon: Users,
        route: "/modules/technicians",
        authModule: "operation",
        requiredRoles: ["admin", "manager", "operator"],
        requiredPlan: "pro",
        navVisible: true,
        isPlaceholder: true,
        routes: [
            { pattern: "/modules/technicians", title: "TÉCNICOS" },
            { pattern: "/modules/technicians/:id", title: "PERFIL DO TÉCNICO" }
        ]
    },
    {
        id: "routes",
        label: "Rotas",
        group: "Operação",
        icon: Map,
        route: "/modules/routes",
        authModule: "operation",
        requiredRoles: ["admin", "manager", "operator"],
        requiredPlan: "pro",
        navVisible: true,
        isPlaceholder: true,
        routes: [
            { pattern: "/modules/routes", title: "ROTAS DE ENTREGA" },
            { pattern: "/modules/routes/:id", title: "DETALHES DA ROTA" }
        ]
    },
    {
        id: "events",
        label: "Eventos Logísticos",
        group: "Operação",
        icon: Calendar,
        route: "/modules/events",
        authModule: "operation",
        requiredRoles: ["admin", "manager", "operator", "viewer"],
        requiredPlan: "pro",
        navVisible: true,
        isPlaceholder: true,
        routes: [
            { pattern: "/modules/events", title: "MURAL DE EVENTOS" }
        ]
    },

    // Admin Group
    {
        id: "finance",
        label: "Financeiro",
        group: "Admin",
        icon: DollarSign,
        route: "/cockpit/finance",
        authModule: "admin",
        requiredRoles: ["admin"],
        navVisible: true,
        isPlaceholder: true,
        routes: [
            { pattern: "/cockpit/finance", title: "FINANCEIRO OBJETIVO" }
        ]
    },
    {
        id: "tenants",
        label: "Tenants",
        group: "Admin",
        icon: Boxes,
        route: "/cockpit/tenants",
        authModule: "admin",
        requiredRoles: ["admin"],
        navVisible: true,
        isPlaceholder: true,
        routes: [
            { pattern: "/cockpit/tenants", title: "GERENCIAMENTO DE TENANTS" }
        ]
    },
    {
        id: "rate-limit",
        label: "Rate Limit",
        group: "Admin",
        icon: Activity,
        route: "/cockpit/rate-limit",
        authModule: "admin",
        requiredRoles: ["admin"],
        navVisible: true,
        routes: [
            { pattern: "/cockpit/rate-limit", title: "RATE LIMITS" }
        ]
    },
    {
        id: "settings",
        label: "Configurações",
        group: "Admin",
        icon: Settings2,
        route: "/settings",
        authModule: "settings",
        requiredRoles: ["admin"],
        navVisible: true,
        routes: [
            { pattern: "/settings", title: "CONFIGURAÇÕES TÉCNICAS" }
        ]
    }
];
