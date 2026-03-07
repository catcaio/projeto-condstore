import { LayoutDashboard, BarChart3, Boxes, Package, Settings2, FileText, Activity, Users, Map, Calendar, DollarSign, BrainCircuit, MessageSquare, Truck } from 'lucide-react';
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
    // ── Operação ────────────────────────────────────────
    {
        id: "home",
        label: "Home",
        group: "Operação",
        icon: LayoutDashboard,
        route: "/home",
        authModule: "cockpit",
        navVisible: false,
        routes: [
            { pattern: "/home", title: "HOME" }
        ],
    },
    {
        id: "cockpit",
        label: "Dashboard",
        group: "Operação",
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
        group: "Operação",
        icon: BarChart3,
        route: "/cockpit/analytics",
        authModule: "cockpit",
        navVisible: true,
        routes: [
            { pattern: "/cockpit/analytics", title: "ANALYTICS" }
        ],
    },
    {
        id: "audit",
        label: "Audit Logs",
        group: "Operação",
        icon: FileText,
        route: "/cockpit/audit",
        authModule: "audit",
        requiredRoles: ["admin", "manager", "operator"],
        navVisible: true,
        routes: [
            { pattern: "/cockpit/audit", title: "AUDITORIA" }
        ]
    },
    {
        id: "acquisition",
        label: "Acquisition",
        group: "Operação",
        icon: Activity,
        route: "/cockpit/acquisition",
        authModule: "acquisition",
        navVisible: true,
        routes: [
            { pattern: "/cockpit/acquisition", title: "ACQUISITION" },
            { pattern: "/cockpit/acquisition/drilldown", title: "DETALHES DE AQUISIÇÃO" }
        ]
    },
    {
        id: "freight-hub",
        label: "Freight Hub",
        group: "Operação",
        icon: Truck,
        route: "/painel-logistico",
        authModule: "frete",
        requiredRoles: ["admin", "manager"],
        navVisible: true,
        routes: [
            { pattern: "/painel-logistico", title: "PAINEL LOGÍSTICO" }
        ]
    },
    {
        id: "packing-profiles",
        label: "Perfis de Embalagem",
        group: "Operação",
        icon: Package,
        route: "/cockpit/packing-profiles",
        authModule: "frete",
        requiredRoles: ["admin", "manager"],
        navVisible: true,
        routes: [
            { pattern: "/cockpit/packing-profiles", title: "PERFIS DE EMBALAGEM" }
        ]
    },
    {
        id: "carrier-tables",
        label: "Tabelas de Frete",
        group: "Operação",
        icon: Truck,
        route: "/cockpit/carrier-tables",
        authModule: "frete",
        requiredRoles: ["admin", "manager"],
        navVisible: true,
        routes: [
            { pattern: "/cockpit/carrier-tables", title: "TABELAS DE TRANSPORTADORAS" }
        ]
    },
    {
        id: "deliveries",
        label: "Entregas",
        group: "Operação",
        icon: Truck,
        route: "/cockpit/deliveries",
        authModule: "dispatch",
        requiredRoles: ["admin", "manager"],
        navVisible: true,
        routes: [
            { pattern: "/cockpit/deliveries", title: "ENTREGAS" }
        ]
    },

    // ── Domínio ─────────────────────────────────────────
    {
        id: "domine",
        label: "Overview",
        group: "Domínio",
        icon: Activity,
        route: "/cockpit/domine",
        authModule: "cockpit",
        requiredRoles: ["admin"],
        navVisible: true,
        routes: [
            { pattern: "/cockpit/domine", title: "DOMINE CONSOLE" },
            { pattern: "/cockpit/domine/dlq", title: "DLQ MANAGER" },
            { pattern: "/cockpit/domine/health", title: "DOMINE HEALTH" }
        ],
    },

    // ── Inteligência ────────────────────────────────────
    {
        id: "knowledge",
        label: "Knowledge & AI",
        group: "Inteligência",
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

    // ── Atendimento ─────────────────────────────────────
    {
        id: "inbox",
        label: "Inbox",
        group: "Atendimento",
        icon: MessageSquare,
        route: "/inbox/conversations",
        authModule: "operation",
        requiredRoles: ["admin", "manager", "operator"],
        navVisible: true,
        routes: [
            { pattern: "/inbox", title: "INBOX" },
            { pattern: "/inbox/conversations", title: "CONVERSAS" },
            { pattern: "/inbox/conversations/:id", title: "CONVERSA DETALHE" }
        ]
    },

    // ── Configurações ───────────────────────────────────
    {
        id: "equipe",
        label: "Equipe",
        group: "Configurações",
        icon: Users,
        route: "/cockpit/equipe",
        authModule: "admin",
        requiredRoles: ["admin", "manager"],
        navVisible: true,
        routes: [
            { pattern: "/cockpit/equipe", title: "EQUIPE" }
        ]
    },
    {
        id: "rate-limit",
        label: "Rate Limit",
        group: "Configurações",
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
        group: "Configurações",
        icon: Settings2,
        route: "/settings",
        authModule: "settings",
        requiredRoles: ["admin"],
        navVisible: true,
        routes: [
            { pattern: "/settings", title: "CONFIGURAÇÕES TÉCNICAS" }
        ]
    },

    // ── Admin ───────────────────────────────────────────
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

    // ── Operação (Placeholder) ──────────────────────────
    {
        id: "dispatch",
        label: "Dispatch",
        group: "Operação",
        icon: Package,
        route: "/modules/dispatch",
        authModule: "dispatch",
        requiredRoles: ["admin", "manager", "operator"],
        requiredPlan: "pro",
        navVisible: false,
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
        navVisible: false,
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
        navVisible: false,
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
        navVisible: false,
        isPlaceholder: true,
        routes: [
            { pattern: "/modules/events", title: "MURAL DE EVENTOS" }
        ]
    },
];
