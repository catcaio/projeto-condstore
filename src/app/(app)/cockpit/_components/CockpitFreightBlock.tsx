'use client';

import { Card, CardContent, CardHeader } from '@/ui/components';

export function CockpitFreightBlock({ freight, loading }: { freight: any, loading: boolean }) {
    if (loading && !freight) {
        return <div className="h-64 rounded-xl w-full bg-slate-200 animate-pulse" />;
    }

    if (!freight && !loading) {
        return (
            <Card>
                <CardHeader heading="Simulações de Frete (7 dias)" subheading="Distribuição geográfica e custo logístico" />
                <CardContent>
                    <div className="text-center py-6 text-sm text-slate-500">
                        Dados de frete temporariamente indisponíveis.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const { total_simulations_7d = 0, avg_peso_7d: rawPeso, top_ufs_7d = [], avg_valor_by_uf_7d = [] } = freight || {};
    const avg_peso_7d = Number(rawPeso) || 0;

    // Combine Top UFs with their corresponding average values
    const safeTopUfs = Array.isArray(top_ufs_7d) ? top_ufs_7d : [];
    const safeAvgValor = Array.isArray(avg_valor_by_uf_7d) ? avg_valor_by_uf_7d : [];

    const ufDataList = safeTopUfs.map((ufData: any) => {
        const valData = safeAvgValor.find((v: any) => v.uf === ufData.uf);
        const parsedValor = valData ? Number(valData.avg_valor) : 0;
        return {
            uf: ufData.uf || 'N/A',
            count: Number(ufData.count) || 0,
            avgValor: isNaN(parsedValor) ? 0 : parsedValor
        };
    });

    return (
        <Card>
            <CardHeader 
                heading="Simulações de Frete (7 dias)" 
                subheading="Distribuição geográfica e custo logístico"
                actions={
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex flex-col items-end">
                            <span className="text-slate-500 font-medium">Simulações</span>
                            <span className="font-bold text-slate-800">{total_simulations_7d}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-slate-500 font-medium">Peso Médio</span>
                            <span className="font-bold text-slate-800">{avg_peso_7d.toFixed(2)} kg</span>
                        </div>
                    </div>
                }
            />
            <CardContent>
                {ufDataList.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-500">
                        Nenhuma simulação de frete encontrada neste período.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-100 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-2">Estado (UF)</th>
                                    <th className="px-4 py-2 text-right">Volume</th>
                                    <th className="px-4 py-2 text-right">Custo Médio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {ufDataList.slice(0, 5).map((row: any) => (
                                    <tr key={row.uf} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium text-slate-700">{row.uf}</td>
                                        <td className="px-4 py-3 text-right text-slate-900">{row.count}</td>
                                        <td className="px-4 py-3 text-right text-slate-900">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.avgValor)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
