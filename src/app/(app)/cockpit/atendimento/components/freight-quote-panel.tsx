'use client';

import { useState, useEffect } from 'react';
import { Clock, Loader2, Package, Plus, Search, Send, ThumbsUp, Truck } from 'lucide-react';
import { Badge } from '@/ui/components';
import { format } from 'date-fns';
import {
    buildActionErrorFromResponse,
    buildActionSuccess,
    buildUnexpectedActionError,
    InlineActionFeedback,
    type ActionFeedbackState,
} from './inline-action-feedback';

interface QuoteResult {
    id: string;
    bestPrice: string;
    bestCarrier: string;
    bestService: string;
    weight: string;
    createdAt: string;
    status?: string;
}

interface FreightQuotePanelProps {
    conversationId: string;
    refreshToken?: number;
    onFlowUpdated?: () => Promise<void> | void;
}

const QUOTE_STATUS_BADGE_LABELS: Record<string, string> = {
    DRAFT: 'Rascunho',
    SENT: 'Enviada',
    ACCEPTED: 'Aprovada',
    CONVERTED: 'Convertida',
    EXPIRED: 'Expirada',
    LOST: 'Perdida',
    CANCELED: 'Cancelada',
};

function getQuoteStatusMeta(status?: string) {
    switch (status) {
        case 'SENT':
            return {
                label: 'Registrar aprovação',
                helper: 'Use esta etapa somente depois da confirmação do cliente no WhatsApp.',
            };
        case 'ACCEPTED':
            return {
                label: 'Gerar pedido DRAFT',
                helper: 'A aprovação já foi registrada. O próximo passo é abrir o pedido operacional.',
            };
        case 'CONVERTED':
            return {
                label: 'Pedido DRAFT gerado',
                helper: 'A cotação já virou pedido. Siga para a confirmação operacional.',
            };
        case 'EXPIRED':
            return {
                label: 'Refazer cotação',
                helper: 'Refaça a cotação antes de seguir no atendimento.',
            };
        default:
            return {
                label: 'Enviar cotação',
                helper: 'Envie a cotação no WhatsApp antes de avançar o fluxo.',
            };
    }
}

export default function FreightQuotePanel({
    conversationId,
    refreshToken = 0,
    onFlowUpdated,
}: FreightQuotePanelProps) {
    const [quotes, setQuotes] = useState<QuoteResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [creatingOrderId, setCreatingOrderId] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

    // Form states
    const [cep, setCep] = useState('');
    const [weight, setWeight] = useState('');
    const [quantity, setQuantity] = useState('1');

    const refreshFlow = async () => {
        await Promise.all([
            fetchQuotes(),
            Promise.resolve(onFlowUpdated?.()),
        ]);
    };

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes`);
            if (res.ok) {
                const json = await res.json();
                setQuotes(json.data);
                return;
            }
            setFeedback(await buildActionErrorFromResponse(
                res,
                'Falha operacional',
                'Não foi possível carregar as cotações deste atendimento.'
            ));
        } catch (err) {
            console.error(err);
            setFeedback(buildUnexpectedActionError(
                'Falha operacional',
                'Não foi possível carregar as cotações deste atendimento.'
            ));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (conversationId) {
            void fetchQuotes();
            setView('list');
        }
    }, [conversationId, refreshToken]);

    const handleSimulate = async () => {
        if (!cep || !weight || !quantity) return;

        setFeedback(null);
        setSimulating(true);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cep, weight, quantity })
            });

            if (res.ok) {
                setView('list');
                setCep('');
                setWeight('');
                setQuantity('1');
                await refreshFlow();
                setFeedback(buildActionSuccess(
                    'Cotação registrada',
                    'A cotação foi salva no atendimento e está pronta para envio no WhatsApp.'
                ));
            } else {
                setFeedback(await buildActionErrorFromResponse(
                    res,
                    'Falha ao registrar cotação',
                    'Não foi possível registrar a cotação.'
                ));
            }
        } catch (err) {
            console.error(err);
            setFeedback(buildUnexpectedActionError(
                'Falha ao registrar cotação',
                'Não foi possível registrar a cotação.'
            ));
        } finally {
            setSimulating(false);
        }
    };

    const handleSendToCustomer = async (quoteId: string) => {
        setFeedback(null);
        setSendingId(quoteId);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/send`, {
                method: 'POST'
            });
            if (res.ok) {
                await refreshFlow();
                setFeedback(buildActionSuccess(
                    'Cotação enviada',
                    'A proposta foi enviada no WhatsApp. O próximo passo é registrar a aprovação do cliente.'
                ));
            } else {
                setFeedback(await buildActionErrorFromResponse(
                    res,
                    'Falha ao enviar cotação',
                    'Não foi possível enviar a cotação ao cliente.'
                ));
            }
        } catch (err) {
            console.error(err);
            setFeedback(buildUnexpectedActionError(
                'Falha ao enviar cotação',
                'Não foi possível enviar a cotação ao cliente.'
            ));
        } finally {
            setSendingId(null);
        }
    };

    const handleAcceptQuote = async (quoteId: string) => {
        setFeedback(null);
        setAcceptingId(quoteId);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/accept`, {
                method: 'POST'
            });
            if (res.ok) {
                await refreshFlow();
                setFeedback(buildActionSuccess(
                    'Aprovação registrada',
                    'A cotação foi marcada como aprovada e já pode virar pedido em DRAFT.'
                ));
            } else {
                setFeedback(await buildActionErrorFromResponse(
                    res,
                    'Falha ao registrar aprovação',
                    'Não foi possível registrar a aprovação da cotação.'
                ));
            }
        } catch (err) {
            console.error(err);
            setFeedback(buildUnexpectedActionError(
                'Falha ao registrar aprovação',
                'Não foi possível concluir a atualização da cotação.'
            ));
        } finally {
            setAcceptingId(null);
        }
    };

    const handleCreateOrder = async (quoteId: string) => {
        setFeedback(null);
        setCreatingOrderId(quoteId);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/order`, {
                method: 'POST'
            });
            if (res.ok) {
                await refreshFlow();
                setFeedback(buildActionSuccess(
                    'Pedido em DRAFT criado',
                    'O pedido foi aberto em DRAFT. O fluxo agora segue para a confirmação operacional.'
                ));
            } else {
                setFeedback(await buildActionErrorFromResponse(
                    res,
                    'Falha ao criar pedido',
                    'Não foi possível gerar o pedido em DRAFT.'
                ));
            }
        } catch (err) {
            console.error(err);
            setFeedback(buildUnexpectedActionError(
                'Falha ao criar pedido',
                'Não foi possível gerar o pedido em DRAFT.'
            ));
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
                <InlineActionFeedback feedback={feedback} />

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
                            Simular cotação
                        </button>
                    </div>
                ) : (
                    <>
                        {loading ? (
                            <div className="text-center text-xs text-[hsl(var(--ui-text-muted))] py-4">Carregando cotações...</div>
                        ) : quotes.length === 0 ? (
                            <div className="text-center text-xs text-[hsl(var(--ui-text-muted))] py-4 flex flex-col items-center gap-2">
                                <Package className="w-8 h-8 opacity-20" />
                                Nenhuma cotação salva. Registre a cotação para continuar o atendimento supervisionado.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {quotes.map(q => {
                                    const statusMeta = getQuoteStatusMeta(q.status);
                                    const canSendQuote = (q.status || 'DRAFT') === 'DRAFT';
                                    const canAcceptQuote = q.status === 'SENT';
                                    const canCreateOrder = q.status === 'ACCEPTED';

                                    return (
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

                                        <div className="flex items-start justify-between gap-3 rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] px-3 py-2">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-muted))]">
                                                    Próximo passo operacional
                                                </p>
                                                <p className="mt-1 text-xs font-medium text-[hsl(var(--ui-text))]">{statusMeta.label}</p>
                                                <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--ui-text-muted))]">{statusMeta.helper}</p>
                                            </div>
                                            <Badge variant="outline">
                                                {QUOTE_STATUS_BADGE_LABELS[q.status || 'DRAFT'] ?? q.status ?? 'DRAFT'}
                                            </Badge>
                                        </div>
                                        
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[hsl(var(--ui-border))]">
                                            <div className="text-[10px] text-[hsl(var(--ui-text-muted))] flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {format(new Date(q.createdAt), 'dd/MM HH:mm')}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {canAcceptQuote ? (
                                                    <button 
                                                        onClick={() => handleAcceptQuote(q.id)}
                                                        disabled={acceptingId === q.id || sendingId === q.id || creatingOrderId === q.id}
                                                        className="text-xs bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                                                    >
                                                        {acceptingId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                                                        Registrar aprovação
                                                    </button>
                                                ) : null}

                                                {canCreateOrder ? (
                                                    <button 
                                                        onClick={() => handleCreateOrder(q.id)}
                                                        disabled={creatingOrderId === q.id || sendingId === q.id || acceptingId === q.id}
                                                        className="text-xs bg-[hsl(var(--ui-accent-blue))] text-white hover:bg-blue-600 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                                                    >
                                                        {creatingOrderId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                                                        Gerar pedido DRAFT
                                                    </button>
                                                ) : null}

                                                {canSendQuote ? (
                                                    <button 
                                                        onClick={() => handleSendToCustomer(q.id)}
                                                        disabled={sendingId === q.id || creatingOrderId === q.id || acceptingId === q.id}
                                                        className="text-xs bg-[hsl(var(--ui-bg-subtle))] hover:bg-[hsl(var(--ui-border))] border border-[hsl(var(--ui-border))] px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                                                    >
                                                        {sendingId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                        Enviar no WhatsApp
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                );})}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
