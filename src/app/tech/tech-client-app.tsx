'use client';

import { useState } from 'react';
import { Map, MapPin, Check, X, Navigation } from 'lucide-react';

interface StopItem {
    stopId: string;
    orderId: string;
    sequence: number;
    status: string;
    customerName: string;
    address: string;
    city: string | null;
    zip: string | null;
    phone: string | null;
    ref: string;
}

export default function TechClientApp({ routeId, tenantId, stops: initialStops }: { routeId: string, tenantId: string, stops: StopItem[] }) {
    const [stops, setStops] = useState(initialStops);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const handleUpdate = async (stopId: string, orderId: string, status: 'completed' | 'failed') => {
        setLoadingMap(prev => ({ ...prev, [stopId]: true }));
        try {
            // Need to pass simulated auth headers if we strictly relied on MVP, but Next.js fetches from client might pass cookies implicitly. 
            // In a PWA, we usually attach a Bearer Token. MVP: Send via body if needed, but our route expects headers. 
            // We'll append tenant header just for MVP
            const headers: any = {
                'Content-Type': 'application/json',
                'x-auth-tenant-id': tenantId,
                'x-auth-role': 'agent'
            };

            const res = await fetch('/api/dispatch/stop-status', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    routeId, stopId, orderId, status, description: `PWA Interaction by tech`
                })
            });

            if (!res.ok) throw new Error('Falha ao atualizar api status');

            setStops(prev => prev.map(s => s.stopId === stopId ? { ...s, status } : s));
            alert(status === 'completed' ? 'Entrega marcada com sucesso' : 'Retorno reportado');
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoadingMap(prev => ({ ...prev, [stopId]: false }));
        }
    };

    const openMaps = (address: string, city: string | null) => {
        const query = encodeURIComponent(`${address}, ${city || ''}`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    return (
        <div className="space-y-4 pb-20">
            {stops.map(s => {
                const isCompleted = s.status === 'completed';
                const isFailed = s.status === 'failed';
                const isPending = s.status === 'pending';

                return (
                    <div key={s.stopId} className={`p-4 rounded-xl border-2 transition-colors ${isCompleted ? 'bg-green-50 border-green-200' : isFailed ? 'bg-red-50 border-red-200' : 'bg-white border-blue-500 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-xs bg-gray-900 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0">{s.sequence}</span>
                            <span className="font-mono text-xs text-gray-500">{s.ref}</span>
                        </div>

                        <h2 className="font-bold text-gray-900 text-lg mb-1">{s.customerName}</h2>

                        <div className="text-sm text-gray-600 mb-4 flex gap-2">
                            <MapPin className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
                            <div>
                                <p className="font-medium">{s.address}</p>
                                <p className="text-xs">{s.city} - {s.zip}</p>
                            </div>
                        </div>

                        {/* Action Bar */}
                        {isPending ? (
                            <div className="flex flex-col gap-2 relative z-20">
                                <button
                                    onClick={() => openMaps(s.address, s.city)}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-3 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                                >
                                    <Map className="w-5 h-5" /> Navegar Maps
                                </button>

                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <button
                                        disabled={loadingMap[s.stopId]}
                                        onClick={() => handleUpdate(s.stopId, s.orderId, 'completed')}
                                        className="flex items-center justify-center gap-1 bg-green-500 text-white py-3 rounded-lg font-bold shadow-sm hover:bg-green-600 disabled:opacity-50"
                                    >
                                        <Check className="w-5 h-5" /> Entregue
                                    </button>
                                    <button
                                        disabled={loadingMap[s.stopId]}
                                        onClick={() => handleUpdate(s.stopId, s.orderId, 'failed')}
                                        className="flex items-center justify-center gap-1 bg-rose-50 border border-rose-200 text-rose-600 py-3 rounded-lg font-bold hover:bg-rose-100 disabled:opacity-50"
                                    >
                                        <X className="w-5 h-5" /> Falhou
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 flex items-center gap-2">
                                {isCompleted ? <span className="font-bold text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Concluído</span> : null}
                                {isFailed ? <span className="font-bold text-red-600 flex items-center gap-1"><X className="w-4 h-4" /> Reportado Falha</span> : null}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
