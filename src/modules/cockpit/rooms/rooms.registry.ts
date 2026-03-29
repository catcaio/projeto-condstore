import { LucideIcon, Inbox, Activity, ShoppingCart, Truck, Sparkles, LineChart, Shield, Settings } from 'lucide-react';

export interface RoomDef {
    id: string;
    label: string;
    description: string;
    icon: any; // We'll map icons later, or pass string names, but Lucide icons are better
    iconName: string;
}

export const rooms: RoomDef[] = [
    { id: 'operacao', label: 'Operação', description: 'Central de controle operacional', icon: Inbox, iconName: 'inbox' },
    { id: 'comercial', label: 'Comercial', description: 'Pipeline, cotações e conversões', icon: Activity, iconName: 'pipeline' },
    { id: 'pedidos', label: 'Pedidos', description: 'Gestão do ciclo de vida dos pedidos', icon: ShoppingCart, iconName: 'orders' },
    { id: 'logistica', label: 'Logística', description: 'Rastreio e processos logísticos', icon: Truck, iconName: 'truck' },
    // MVP freeze: manter a sala Frank visível por compatibilidade, sem expandir escopo sem autorização explícita.
    { id: 'frank', label: 'Frank', description: 'Gerencie opções e inteligência do Frank', icon: Sparkles, iconName: 'sparkles' },
    { id: 'inteligencia', label: 'Inteligência', description: 'Métricas e performance', icon: LineChart, iconName: 'chart' },
    { id: 'governanca', label: 'Governança', description: 'Logs, auditorias e eventos do sistema', icon: Shield, iconName: 'shield' },
    { id: 'configuracoes', label: 'Configurações', description: 'Tenant, usuários, canais e regras', icon: Settings, iconName: 'settings' }
];
