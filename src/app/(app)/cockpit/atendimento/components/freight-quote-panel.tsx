'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Send, Loader2, Plus, Clock, Truck } from 'lucide-react';
import { Badge } from '@/ui/components';
import { format } from 'date-fns';

interface QuoteResult {
    id: string;
    bestPrice: string;
    bestCarrier: string;
    bestService: string;
    weight: string;
    createdAt: string;
    status?: string;
}

export default function FreightQuotePanel({ conversationId }: { conversationId: string }) {
    const [quotes, setQuotes] = useState<QuoteResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [creatingOrderId, setCreatingOrderId] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'form'>('list');

    // Form states
    const [cep, setCep] = useState('');
    const [weight, setWeight] = useState('');
    const [quantity, setQuantity] = useState('1');

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes`);
            if (res.ok) {
                const json = await res.json();
                setQuotes(json.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (conversationId) {
            fetchQuotes();
            setView('list');
        }
    }, [conversationId]);

    const handleSimulate = async () => {
        if (!cep || !weight || !quantity) return;
        setSimulating(true);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cep, weight, quantity })
            });

            if (res.ok) {
                setView('list');
                fetchQuotes();
                // Clear form
                setCep(''); setWeight(''); setQuantity('1');
            } else {
                alert('Erro ao simular frete.');
            }
        } catch (err) {
            alert('Falha na requisição.');
        } finally {
            setSimulating(false);
        }
    };

    const handleSendToCustomer = async (quoteId: string) => {
        if (!confirm('Deseja enviar o resultado desta cotação para o cliente no WhatsApp?')) return;
        setSendingId(quoteId);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/send`, {
                method: 'POST'
            });
            if (res.ok) {
                alert('Cotação enviada com sucesso!');
                fetchQuotes(); // refresh status if needed
            } else {
                alert('Erro ao enviar cotação.');
            }
        } catch (err) {
            alert('Falha na requisição.');
        } finally {
            setSendingId(null);
        }
    };

    const handleCreateOrder = async (quoteId: string) => {
        if (!confirm('Transformar essa cotação em um Pedido Logístico? A conversa será marcada como Ganho.')) return;
        setCreatingOrderId(quoteId);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/order`, {
                method: 'POST'
            });
            if (res.ok) {
                alert('Pedido criado com sucesso!');
                // trigger a full reload to show the stage change
                window.location.reload();
            } else {
                alert('Erro ao converter pedido.');
            }
        } catch (err) {
            alert('Falha na requisição.');
        } finally {
            setCreatingOrderId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[hsl(var(--ui-bg))]">
            <div className="p-4 border-b border-[hsl(var(--ui-border))] flex justify-between items-center bg-[hsl(var(--ui-bg-subtle))]">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" /> Cotação de Frete
                </h3>
                {view === 'list' && (
                    <button 
                        onClick={() => setView('form')}
                        className="text-xs flex items-center gap-1 text-[hsl(var(--ui-accent-blue))] font-medium hover:underline"
                    >
                        <Plus className="w-3 h-3" /> Nova
                    </button>
                )}
                {view === 'form' && (
                    <button 
                        onClick={() => setView('list')}
                        className="text-xs text-[hsl(var(--ui-text-muted))] hover:underline"
                    >
                        Voltar
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {view === 'form' ? (
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="text-xs font-medium text-[hsl(var(--ui-text-muted))] mb-1 block">CEP Destino</label>
                            <input 
                                type="text"
                                maxLength={8}
                                value={cep}
                                onChange={e => setCep(e.target.value.replace(/\D/g, ''))}
                                placeholder="Apenas números"
                                className="w-full rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-3 py-1.5 text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-[hsl(var(--ui-text-muted))] mb-1 block">Peso (kg)</label>
                                <input 
                                    type="number"
                                    value={weight}
                                    onChange={e => setWeight(e.target.value)}
                                    placeholder="Ex: 5.5"
                                    className="w-full rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-3 py-1.5 text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-medium text-[hsl(var(--ui-text-muted))] mb-1 block">Qtd Volume</label>
                                <input 
                                    type="number"
                                    value={quantity}
                                    disabled
                                    className="w-full rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] px-3 py-1.5 text-sm opacity-70"
                                />
                            </div>
                        </div>
                        <button 
                            onClick={handleSimulate}
                            disabled={!cep || !weight || simulating}
                            className="mt-2 w-full bg-[hsl(var(--ui-accent-blue))] text-white p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Simular
                        </button>
                    </div>
                ) : (
                    <>
                        {loading ? (
                            <div className="text-center text-xs text-[hsl(var(--ui-text-muted))] py-4">Carregando cotações...</div>
                        ) : quotes.length === 0 ? (
                            <div className="text-center text-xs text-[hsl(var(--ui-text-muted))] py-4 flex flex-col items-center gap-2">
                                <Package className="w-8 h-8 opacity-20" />
                                Nenhuma cotação salva.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {quotes.map(q => (
                                    <div key={q.id} className="border border-[hsl(var(--ui-border))] rounded-md p-3 bg-[hsl(var(--ui-bg))]">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-semibold text-sm">
                                                {q.bestCarrier || 'Transportadora Parceira'}
                                                <div className="text-[10px] text-[hsl(var(--ui-text-muted))] uppercase mt-0.5">{q.bestService}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-[hsl(var(--ui-success-ink))] text-sm">
                                                    R$ {Number(q.bestPrice).toFixed(2).replace('.', ',')}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[hsl(var(--ui-border))]">
                                            <div className="text-[10px] text-[hsl(var(--ui-text-muted))] flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {format(new Date(q.createdAt), 'dd/MM HH:mm')}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleCreateOrder(q.id)}
                                                    disabled={creatingOrderId === q.id || sendingId === q.id}
                                                    className="text-xs bg-[hsl(var(--ui-accent-blue))] text-white hover:bg-blue-600 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                                                >
                                                    {creatingOrderId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                                                    Criar Pedido
                                                </button>
                                                <button 
                                                    onClick={() => handleSendToCustomer(q.id)}
                                                    disabled={sendingId === q.id || creatingOrderId === q.id}
                                                    className="text-xs bg-[hsl(var(--ui-bg-subtle))] hover:bg-[hsl(var(--ui-border))] border border-[hsl(var(--ui-border))] px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                                                >
                                                    {sendingId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                    Enviar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
