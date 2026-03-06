"use client";

import { useEffect, useState } from "react";
import { BarChart3, ArrowRight, TrendingUp, MessageCircle, DollarSign, RefreshCcw, ShoppingCart, Users } from "lucide-react";
import { SettingsPage, SettingsSection } from "@/ui/settings";
import { Card } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface AcquisitionMetrics { leads_total: number; attributed_traffic_total: number; }
interface ConversionMetrics {
    quotes_total: number; checkout_started_total: number; checkout_completed_total: number;
    orders_total: number; quote_to_order_rate: number; checkout_completion_rate: number;
}
interface OperationsMetrics {
    messages_received_total: number; message_replied_total: number;
    delivery_created_total: number; delivery_completed_total: number;
}
interface RevenueMetrics { payments_confirmed_total: number; }
interface RetentionMetrics { repeat_orders_total: number; reactivated_customers_total: number; }
interface CoreMetrics {
    tenantId: string;
    range: { from: string; to: string };
    acquisition: AcquisitionMetrics;
    conversion: ConversionMetrics;
    operations: OperationsMetrics;
    revenue: RevenueMetrics;
    retention: RetentionMetrics;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, icon, sub }: {
    title: string; value: string | number; icon: React.ReactNode; sub?: string;
}) {
    return (
        <Card className="p-4 flex flex-col justify-between h-28 border-[hsl(var(--ui-border))] hover:border-[hsl(var(--ui-border-hover))] transition-colors bg-[hsl(var(--ui-bg))]">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">{title}</span>
                {icon}
            </div>
            <div>
                <span className="text-2xl font-bold tracking-tight">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</span>
                {sub && <p className="text-[10px] text-[hsl(var(--ui-text-muted))] mt-0.5">{sub}</p>}
            </div>
        </Card>
    );
}

function RateBar({ label, rate }: { label: string; rate: number }) {
    const pct = Math.min(Math.round(rate * 100), 100);
    return (
        <div className="flex items-center gap-3 py-2">
            <span className="text-sm w-56 shrink-0 text-[hsl(var(--ui-text-muted))]">{label}</span>
            <div className="flex-1 h-2 bg-[hsl(var(--ui-bg-subtle))] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-[hsl(var(--ui-accent-blue))] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <Badge variant={pct >= 20 ? 'success' : pct >= 5 ? 'default' : 'muted'} className="w-14 text-center">
                {pct}%
            </Badge>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MetricsCockpitPage() {
    const [data, setData] = useState<CoreMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [range] = useState(() => {
        const to = new Date();
        const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { from: from.toISOString(), to: to.toISOString() };
    });

    async function loadData() {
        setLoading(true);
        setError("");
        try {
            // Get tenantId from session header (injected by middleware)
            const hdrs = await fetch("/api/internal/me").then(r => r.ok ? r.json() : null).catch(() => null);
            const tenantId = hdrs?.tenantId ?? "unknown";

            const res = await fetch(
                `/api/internal/tenants/${tenantId}/metrics/core?from=${range.from}&to=${range.to}`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.ok && json.data) setData(json.data);
            else throw new Error("Invalid response");
        } catch (err: any) {
            setError(err.message || "Erro ao carregar métricas");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const headerAction = (
        <div className="flex items-center gap-2">
            <Link href="/cockpit" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline flex items-center gap-1">
                &larr; Cockpit
            </Link>
            <button
                onClick={loadData}
                className="flex items-center gap-1 text-xs px-3 py-1 bg-[hsl(var(--ui-accent-blue))] text-white rounded font-medium hover:opacity-90"
            >
                <RefreshCcw className="w-3 h-3" /> Atualizar
            </button>
        </div>
    );

    if (loading && !data) {
        return (
            <SettingsPage title="Métricas do Cockpit" description="Business intelligence derivado de operational_events" headerAction={headerAction}>
                <div className="text-sm text-[hsl(var(--ui-text-muted))] py-8 text-center animate-pulse">Carregando métricas...</div>
            </SettingsPage>
        );
    }

    if (error) {
        return (
            <SettingsPage title="Métricas do Cockpit" description="Business intelligence derivado de operational_events" headerAction={headerAction}>
                <div className="text-red-500 text-sm py-4">Erro: {error}</div>
            </SettingsPage>
        );
    }

    if (!data) return null;

    const { acquisition: acq, conversion: conv, operations: ops, revenue: rev, retention: ret } = data;

    return (
        <SettingsPage
            title="Métricas do Cockpit"
            description="Business intelligence derivado de operational_events (últimos 30 dias)"
            headerAction={headerAction}
        >

            {/* ── ACQUISITION ─────────────────────────────────────────────── */}
            <SettingsSection title="📥 Aquisição">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard title="Leads Gerados" value={acq.leads_total} icon={<Users className="w-4 h-4 text-blue-400" />} />
                    <KpiCard title="Tráfego Atribuído" value={acq.attributed_traffic_total} icon={<TrendingUp className="w-4 h-4 text-green-400" />} />
                </div>
            </SettingsSection>

            {/* ── CONVERSION ──────────────────────────────────────────────── */}
            <SettingsSection title="🔄 Conversão">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <KpiCard title="Cotações Criadas" value={conv.quotes_total} icon={<BarChart3 className="w-4 h-4 text-yellow-400" />} />
                    <KpiCard title="Checkouts Iniciados" value={conv.checkout_started_total} icon={<ShoppingCart className="w-4 h-4 text-orange-400" />} />
                    <KpiCard title="Checkouts Completos" value={conv.checkout_completed_total} icon={<ShoppingCart className="w-4 h-4 text-green-400" />} />
                    <KpiCard title="Pedidos Criados" value={conv.orders_total} icon={<ArrowRight className="w-4 h-4 text-purple-400" />} />
                </div>
                <div className="border border-[hsl(var(--ui-border))] rounded p-4 bg-[hsl(var(--ui-bg-subtle))]">
                    <p className="text-xs font-semibold text-[hsl(var(--ui-text-muted))] mb-3 uppercase tracking-wide">Taxas de Conversão</p>
                    <RateBar label="Cotação → Pedido" rate={conv.quote_to_order_rate} />
                    <RateBar label="Checkout Iniciado → Completo" rate={conv.checkout_completion_rate} />
                </div>
            </SettingsSection>

            {/* ── OPERATIONS ──────────────────────────────────────────────── */}
            <SettingsSection title="⚙️ Operações">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard title="Mensagens Recebidas" value={ops.messages_received_total} icon={<MessageCircle className="w-4 h-4 text-blue-400" />} />
                    <KpiCard title="Mensagens Respondidas" value={ops.message_replied_total} icon={<MessageCircle className="w-4 h-4 text-green-400" />} />
                    <KpiCard title="Entregas Criadas" value={ops.delivery_created_total} icon={<ArrowRight className="w-4 h-4 text-yellow-400" />} />
                    <KpiCard title="Entregas Concluídas" value={ops.delivery_completed_total} icon={<ArrowRight className="w-4 h-4 text-green-400" />} />
                </div>
            </SettingsSection>

            {/* ── REVENUE ─────────────────────────────────────────────────── */}
            <SettingsSection title="💰 Receita">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard
                        title="Pagamentos Confirmados"
                        value={rev.payments_confirmed_total}
                        icon={<DollarSign className="w-4 h-4 text-green-400" />}
                    />
                </div>
            </SettingsSection>

            {/* ── RETENTION ───────────────────────────────────────────────── */}
            <SettingsSection title="🔁 Retenção">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard title="Pedidos Recorrentes" value={ret.repeat_orders_total} icon={<RefreshCcw className="w-4 h-4 text-blue-400" />} />
                    <KpiCard title="Clientes Reativados" value={ret.reactivated_customers_total} icon={<Users className="w-4 h-4 text-purple-400" />} />
                </div>
            </SettingsSection>

        </SettingsPage>
    );
}
