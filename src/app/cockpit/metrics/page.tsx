'use client';

import { useEffect, useState } from 'react';
import { SettingsRow } from '@/components/ui/SettingsRow';

interface FunnelMetrics {
    counts: {
        intentDetected: number;
        cepProvided: number;
        quantityProvided: number;
        freightQuoted: number;
        orderCreated: number;
    };
    rates: {
        cepPerFlow: number;
        qtyPerCep: number;
        freightPerQty: number;
        overallConversion: number;
    };
    dropoffs: {
        flowToCep: { absolute: number; relativeUrl: number };
        cepToQty: { absolute: number; relativeUrl: number };
        qtyToFreight: { absolute: number; relativeUrl: number };
    };
}

export default function MetricsPage() {
    const [data, setData] = useState<FunnelMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                const response = await fetch('/api/cockpit/metrics/funnel');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const json = await response.json();
                setData(json);
            } catch (e: any) {
                setError(e.message || 'Failed to fetch metrics');
            } finally {
                setLoading(false);
            }
        }

        fetchMetrics();
    }, []);

    if (loading) {
        return (
            <div className="os-layout" style={{ '--os-bg': '#000', color: '#fff' } as any}>
                <div style={{ padding: '20px' }}>Carregando métricas...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="os-layout" style={{ '--os-bg': '#000', color: '#fff' } as any}>
                <div style={{ padding: '20px', color: 'red' }}>Erro: {error}</div>
            </div>
        );
    }

    if (!data || Object.values(data.counts).every((v) => v === 0)) {
        return (
            <div className="os-layout" style={{ '--os-bg': '#000', color: '#fff' } as any}>
                <div style={{ padding: '20px' }}>Nenhum evento de funil registrado (7d).</div>
            </div>
        );
    }

    return (
        <div className="os-layout" style={{ '--os-bg': '#000', minHeight: '100vh', color: '#fff' } as any}>
            <div style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Métricas do Funil (7d)</h1>

                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '12px', color: 'var(--os-text2)' }}>Counts</h2>
                    <div style={{ background: '#1c1c1e', borderRadius: '10px', overflow: 'hidden' }}>
                        <SettingsRow label="Intent Detected" rightValue={data.counts.intentDetected.toString()} chevron={false} />
                        <SettingsRow label="CEP Provided" rightValue={data.counts.cepProvided.toString()} chevron={false} />
                        <SettingsRow label="Quantity Provided" rightValue={data.counts.quantityProvided.toString()} chevron={false} />
                        <SettingsRow label="Freight Quoted" rightValue={data.counts.freightQuoted.toString()} chevron={false} />
                        {data.counts.orderCreated !== undefined && (
                            <SettingsRow label="Order Created" rightValue={data.counts.orderCreated.toString()} chevron={false} />
                        )}
                    </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '12px', color: 'var(--os-text2)' }}>Rates (Conversão)</h2>
                    <div style={{ background: '#1c1c1e', borderRadius: '10px', overflow: 'hidden' }}>
                        <SettingsRow label="Flow → CEP" rightValue={`${(data.rates.cepPerFlow * 100).toFixed(1)}%`} chevron={false} />
                        <SettingsRow label="CEP → QTY" rightValue={`${(data.rates.qtyPerCep * 100).toFixed(1)}%`} chevron={false} />
                        <SettingsRow label="QTY → Freight" rightValue={`${(data.rates.freightPerQty * 100).toFixed(1)}%`} chevron={false} />
                    </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '12px', color: 'var(--os-text2)' }}>Drop-off (Abandono)</h2>
                    <div style={{ background: '#1c1c1e', borderRadius: '10px', overflow: 'hidden' }}>
                        <SettingsRow
                            label="Drop: Flow → CEP"
                            rightValue={`${data.dropoffs.flowToCep.absolute} (-${(data.dropoffs.flowToCep.relativeUrl * 100).toFixed(1)}%)`}
                            chevron={false}
                        />
                        <SettingsRow
                            label="Drop: CEP → QTY"
                            rightValue={`${data.dropoffs.cepToQty.absolute} (-${(data.dropoffs.cepToQty.relativeUrl * 100).toFixed(1)}%)`}
                            chevron={false}
                        />
                        <SettingsRow
                            label="Drop: QTY → Freight"
                            rightValue={`${data.dropoffs.qtyToFreight.absolute} (-${(data.dropoffs.qtyToFreight.relativeUrl * 100).toFixed(1)}%)`}
                            chevron={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
