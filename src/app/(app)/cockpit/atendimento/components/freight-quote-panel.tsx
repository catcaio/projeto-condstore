'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2, Package, Plus, Search, Send, ShieldCheck, Truck } from 'lucide-react';
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
    sentAt?: string | null;
    expiresAt?: string | null;
    convertedAt?: string | null;
}

interface ActionNotice {
    tone: 'success' | 'error';
    title: string;
    message: string;
    requestId?: string;
}

interface FreightQuotePanelProps {
    conversationId: string;
    onFlowChanged?: () => void | Promise<void>;
}

function getQuoteStatusMeta(status?: string) {
    switch (status) {
        case 'ACCEPTED':
            return {
                label: 'Aprovada',
                variant: 'success' as const,
                helper: 'Cliente confirmado. Pedido liberado para criacao.',
            };
        case 'SENT':
            return {
                label: 'Enviada',
                variant: 'default' as const,
                helper: 'Aguardando registro de aprovacao para liberar o pedido.',
            };
        case 'CONVERTED':
            return {
                label: 'Convertida',
                variant: 'success' as const,
                helper: 'Pedido ja criado a partir desta cotacao.',
            };
        case 'EXPIRED':
            return {
                label: 'Expirada',
                variant: 'danger' as const,
                helper: 'Prazo vencido. Gere uma nova cotacao antes de seguir.',
            };
        case 'LOST':
            return {
                label: 'Perdida',
                variant: 'danger' as const,
                helper: 'Fluxo comercial encerrado para esta cotacao.',
            };
        case 'CANCELED':
            return {
                label: 'Cancelada',
                variant: 'danger' as const,
                helper: 'Cotacao cancelada. Nao pode virar pedido.',
            };
        default:
            return {
                label: 'Rascunho',
                variant: 'outline' as const,
                helper: 'Envie ao cliente e registre a aprovacao antes de criar o pedido.',
            };
    }
}

function canSendQuote(status?: string) {
    return !['CONVERTED', 'EXPIRED', 'LOST', 'CANCELED'].includes(status || '');
}

function canAcceptQuote(status?: string) {
    return !['ACCEPTED', 'CONVERTED', 'EXPIRED', 'LOST', 'CANCELED'].includes(status || '');
}

function canCreateOrder(status?: string) {
    return status === 'ACCEPTED';
}

async function readApiError(response: Response, fallbackMessage: string) {
    try {
        const payload = await response.json();
        return {
            message: payload?.error?.message || fallbackMessage,
            requestId: payload?.error?.requestId as string | undefined,
        };
    } catch {
        return { message: fallbackMessage };
    }
}

export default function FreightQuotePanel({ conversationId, onFlowChanged }: FreightQuotePanelProps) {
    const [quotes, setQuotes] = useState<QuoteResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [creatingOrderId, setCreatingOrderId] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [notice, setNotice] = useState<ActionNotice | null>(null);

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
                return;
            }

            const error = await readApiError(res, 'Nao foi possivel carregar as cotacoes desta conversa.');
            setNotice({
                tone: 'error',
                title: 'Falha ao carregar cotacoes',
                message: error.message,
                requestId: error.requestId,
            });
        } catch (err) {
            console.error(err);
            setNotice({
                tone: 'error',
                title: 'Falha ao carregar cotacoes',
                message: 'Nao foi possivel consultar as cotacoes agora. Tente novamente.',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (conversationId) {
            void fetchQuotes();
            setView('list');
        }
    }, [conversationId]);

    const handleSimulate = async () => {
        if (!cep || !weight || !quantity) return;
        setSimulating(true);
        setNotice(null);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cep, weight, quantity })
            });

            if (res.ok) {
                setView('list');
                await fetchQuotes();
                await Promise.resolve(onFlowChanged?.());
                // Clear form
                setCep(''); setWeight(''); setQuantity('1');
                setNotice({
                    tone: 'success',
                    title: 'Cotacao registrada',
                    message: 'A simulacao foi salva e ja esta pronta para envio ou aprovacao.',
                });
            } else {
                const error = await readApiError(res, 'Erro ao simular frete.');
                setNotice({
                    tone: 'error',
                    title: 'Nao foi possivel gerar a cotacao',
                    message: error.message,
                    requestId: error.requestId,
                });
            }
        } catch {
            setNotice({
                tone: 'error',
                title: 'Falha na requisicao',
                message: 'Nao foi possivel salvar a cotacao. Tente novamente.',
            });
        } finally {
            setSimulating(false);
        }
    };

    const handleSendToCustomer = async (quoteId: string) => {
        setSendingId(quoteId);
        setNotice(null);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/send`, {
                method: 'POST'
            });
            if (res.ok) {
                await fetchQuotes();
                await Promise.resolve(onFlowChanged?.());
                setNotice({
                    tone: 'success',
                    title: 'Cotacao enviada',
                    message: 'O cliente recebeu a cotacao no WhatsApp. Registre a aprovacao assim que houver retorno.',
                });
            } else {
                const error = await readApiError(res, 'Erro ao enviar cotacao.');
                setNotice({
                    tone: 'error',
                    title: 'Envio nao concluido',
                    message: error.message,
                    requestId: error.requestId,
                });
            }
        } catch {
            setNotice({
                tone: 'error',
                title: 'Falha na requisicao',
                message: 'Nao foi possivel enviar a cotacao agora.',
            });
        } finally {
            setSendingId(null);
        }
    };

    const handleAcceptQuote = async (quoteId: string) => {
        setAcceptingId(quoteId);
        setNotice(null);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/accept`, {
                method: 'POST'
            });

            if (res.ok) {
                await fetchQuotes();
                await Promise.resolve(onFlowChanged?.());
                setNotice({
                    tone: 'success',
                    title: 'Aprovacao registrada',
                    message: 'A cotacao foi marcada como aprovada e o pedido ja pode ser criado.',
                });
            } else {
                const error = await readApiError(res, 'Erro ao registrar aprovacao da cotacao.');
                setNotice({
                    tone: 'error',
                    title: 'Aprovacao nao registrada',
                    message: error.message,
                    requestId: error.requestId,
                });
            }
        } catch {
            setNotice({
                tone: 'error',
                title: 'Falha na requisicao',
                message: 'Nao foi possivel registrar a aprovacao agora.',
            });
        } finally {
            setAcceptingId(null);
        }
    };

    const handleCreateOrder = async (quoteId: string) => {
        setCreatingOrderId(quoteId);
        setNotice(null);
        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/order`, {
                method: 'POST'
            });
            if (res.ok) {
                const json = await res.json();
                await fetchQuotes();
                await Promise.resolve(onFlowChanged?.());
                const orderLabel = json?.data?.id ? `Pedido #${String(json.data.id).slice(0, 8)}` : 'Pedido';
                setNotice({
                    tone: 'success',
                    title: 'Pedido criado',
                    message: `${orderLabel} gerado a partir da cotacao aprovada.`,
                });
            } else {
                const error = await readApiError(res, 'Erro ao converter cotacao em pedido.');
                setNotice({
                    tone: 'error',
                    title: 'Conversao nao concluida',
                    message: error.message,
                    requestId: error.requestId,
                });
            }
        } catch {
            setNotice({
                tone: 'error',
                title: 'Falha na requisicao',
                message: 'Nao foi possivel criar o pedido agora.',
            });
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
                        <div className="rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] p-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--ui-text-muted))]">
                                Fluxo supervisionado
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                                <div className="rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-2 py-2 font-medium text-[hsl(var(--ui-text))]">
                                    1. Enviar
                                </div>
                                <div className="rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-2 py-2 font-medium text-[hsl(var(--ui-text))]">
                                    2. Aprovar
                                </div>
                                <div className="rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-2 py-2 font-medium text-[hsl(var(--ui-text))]">
                                    3. Criar pedido
                                </div>
                            </div>
                        </div>

                        {notice && (
                            <div
                                className={`rounded-lg border p-3 ${
                                    notice.tone === 'success'
                                        ? 'border-[hsl(var(--ui-success)/0.3)] bg-[hsl(var(--ui-success)/0.08)] text-[hsl(var(--ui-success-ink))]'
                                        : 'border-[hsl(var(--ui-danger)/0.3)] bg-[hsl(var(--ui-danger)/0.08)] text-[hsl(var(--ui-danger-ink))]'
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    {notice.tone === 'success' ? (
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                    ) : (
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold">{notice.title}</div>
                                        <div className="mt-1 text-xs leading-relaxed">{notice.message}</div>
                                        {notice.requestId && (
                                            <div className="mt-1 text-[10px] opacity-80">Req. {notice.requestId}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center text-xs text-[hsl(var(--ui-text-muted))] py-4">Carregando cotações...</div>
                        ) : quotes.length === 0 ? (
                            <div className="text-center text-xs text-[hsl(var(--ui-text-muted))] py-4 flex flex-col items-center gap-2">
                                <Package className="w-8 h-8 opacity-20" />
                                Nenhuma cotação salva.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {quotes.map(q => {
                                    const statusMeta = getQuoteStatusMeta(q.status);
                                    const sendEnabled = canSendQuote(q.status);
                                    const acceptEnabled = canAcceptQuote(q.status);
                                    const createEnabled = canCreateOrder(q.status);
                                    const isBusy = sendingId === q.id || acceptingId === q.id || creatingOrderId === q.id;

                                    return (
                                    <div key={q.id} className="border border-[hsl(var(--ui-border))] rounded-md p-3 bg-[hsl(var(--ui-bg))]">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-semibold text-sm">
                                                {q.bestCarrier || 'Transportadora Parceira'}
                                                <div className="text-[10px] text-[hsl(var(--ui-text-muted))] uppercase mt-0.5">{q.bestService}</div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <div className="font-bold text-[hsl(var(--ui-success-ink))] text-sm">
                                                    R$ {Number(q.bestPrice || 0).toFixed(2).replace('.', ',')}
                                                </div>
                                                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                                            </div>
                                        </div>

                                        <div className="rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] px-3 py-2 text-xs text-[hsl(var(--ui-text-muted))]">
                                            <div className="flex items-center gap-2 font-medium text-[hsl(var(--ui-text))]">
                                                <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--ui-accent-blue))]" />
                                                Proximo passo operacional
                                            </div>
                                            <div className="mt-1 leading-relaxed">{statusMeta.helper}</div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[hsl(var(--ui-border))]">
                                            <div className="text-[10px] text-[hsl(var(--ui-text-muted))] flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {format(new Date(q.createdAt), 'dd/MM HH:mm')}
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleSendToCustomer(q.id)}
                                                    disabled={!sendEnabled || isBusy}
                                                    className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50 ${
                                                        !q.status || q.status === 'DRAFT'
                                                            ? 'bg-[hsl(var(--ui-accent-blue))] text-white hover:bg-blue-600'
                                                            : 'bg-[hsl(var(--ui-bg-subtle))] hover:bg-[hsl(var(--ui-border))] border border-[hsl(var(--ui-border))]'
                                                    }`}
                                                    title={sendEnabled ? undefined : 'Cotacoes convertidas ou encerradas nao podem ser reenviadas.'}
                                                >
                                                    {sendingId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                    {q.status === 'SENT' || q.status === 'ACCEPTED' ? 'Reenviar' : 'Enviar'}
                                                </button>
                                                <button
                                                    onClick={() => handleAcceptQuote(q.id)}
                                                    disabled={!acceptEnabled || isBusy}
                                                    className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50 ${
                                                        q.status === 'SENT'
                                                            ? 'bg-[hsl(var(--ui-success-ink))] text-white hover:opacity-90'
                                                            : 'bg-[hsl(var(--ui-bg-subtle))] hover:bg-[hsl(var(--ui-border))] border border-[hsl(var(--ui-border))]'
                                                    }`}
                                                    title={acceptEnabled ? undefined : 'Aprovacao ja registrada ou cotacao encerrada.'}
                                                >
                                                    {acceptingId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                                    {q.status === 'ACCEPTED' ? 'Aprovada' : 'Registrar aprovacao'}
                                                </button>
                                                <button 
                                                    onClick={() => handleCreateOrder(q.id)}
                                                    disabled={!createEnabled || isBusy}
                                                    className="text-xs bg-[hsl(var(--ui-accent-blue))] text-white hover:bg-blue-600 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                                                    title={createEnabled ? undefined : 'Somente cotacoes aprovadas podem virar pedido.'}
                                                >
                                                    {creatingOrderId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                                                    {q.status === 'CONVERTED' ? 'Pedido criado' : 'Criar pedido'}
                                                </button>
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
