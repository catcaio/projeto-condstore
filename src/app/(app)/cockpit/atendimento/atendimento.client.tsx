'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, User, Clock, Check, RefreshCw, AlertCircle, Phone, History } from 'lucide-react';
import { Badge } from '@/ui/components';
import FreightQuotePanel from './components/freight-quote-panel';
import PipelineActions from './components/pipeline-actions';
import OrderShipmentPanel from './components/order-shipment-panel';
import { FrankSuggestionPanel } from './components/frank-suggestion-panel';
import { DynamicFieldsRenderer } from '@/ui/cockpit/custom-fields/dynamic-fields-renderer';
import { TimelineFeed } from '@/ui/timeline/timeline-feed';
import { PlaybookQuickActions } from '@/ui/playbooks/playbook-quick-actions';

interface Conversation {
    id: string;
    phoneHash?: string;
    phone?: string;
    status: 'OPEN' | 'WAITING_CUSTOMER' | 'WAITING_INTERNAL' | 'RESOLVED';
    stage?: 'NEW' | 'QUALIFYING' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST';
    assignedTo?: string;
    lastMessageAt: string;
}

interface Message {
    id: string;
    direction: 'INBOUND' | 'OUTBOUND';
    source: string;
    message: string;
    createdAt: string;
}

export default function AtendimentoClient({ tenantId }: { tenantId: string }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeConvDetails, setActiveConvDetails] = useState<Conversation | null>(null);
    
    const [loadingList, setLoadingList] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [sending, setSending] = useState(false);
    
    const [draftText, setDraftText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const abortControllers = useRef<{
        list: AbortController | null;
        msgs: AbortController | null;
    }>({ list: null, msgs: null });

    const fetchConversations = async () => {
        if (abortControllers.current.list) abortControllers.current.list.abort();
        const controller = new AbortController();
        abortControllers.current.list = controller;

        try {
            const res = await fetch('/api/cockpit/conversations', { signal: controller.signal });
            if (res.ok) {
                const json = await res.json();
                setConversations(json.data || []);
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') console.error(e);
        } finally {
            setLoadingList(false);
        }
    };

    const fetchMessages = async (id: string, silent = false) => {
        if (abortControllers.current.msgs) abortControllers.current.msgs.abort();
        const controller = new AbortController();
        abortControllers.current.msgs = controller;

        if (!silent) setLoadingMsgs(true);
        try {
            const res = await fetch(`/api/cockpit/conversations/${id}`, { signal: controller.signal });
            if (res.ok) {
                const json = await res.json();
                setMessages(json.data.messages || []);
                setActiveConvDetails(json.data.conversation);
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') console.error(e);
        } finally {
            if (abortControllers.current.msgs === controller) {
                if (!silent) setLoadingMsgs(false);
            }
        }
    };

    useEffect(() => {
        fetchConversations();
        const t = setInterval(fetchConversations, 15000); // poll list every 15s
        return () => {
            clearInterval(t);
            if (abortControllers.current.list) {
                abortControllers.current.list.abort();
            }
        };
    }, []);

    useEffect(() => {
        if (activeConvId) {
            fetchMessages(activeConvId);
            const t = setInterval(() => fetchMessages(activeConvId, true), 8000); // poll messages every 8s
            return () => {
                clearInterval(t);
                if (abortControllers.current.msgs) {
                    abortControllers.current.msgs.abort();
                }
            };
        } else {
            setMessages([]);
            setActiveConvDetails(null);
        }
    }, [activeConvId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!draftText.trim() || !activeConvId) return;
        setSending(true);
        try {
            const res = await fetch(`/api/cockpit/conversations/${activeConvId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: draftText }),
            });
            if (res.ok) {
                setDraftText('');
                fetchMessages(activeConvId, true);
                fetchConversations();
            } else {
                alert('Erro ao enviar a mensagem.');
            }
        } catch (e) {
            alert('Falha na requisição.');
        } finally {
            setSending(false);
        }
    };

    const handleApproveAndSend = async (text: string, suggestionId: string) => {
        if (!activeConvId) return false;
        try {
            const approveRes = await fetch(`/api/cockpit/frank/suggestions/${suggestionId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ finalSentResponse: text }),
            });
            if (!approveRes.ok) return false;

            const sendRes = await fetch(`/api/cockpit/conversations/${activeConvId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });
            if (sendRes.ok) {
                fetchMessages(activeConvId, true);
                fetchConversations();
                return true;
            }
        } catch (e) {
            console.error('Failed to approve suggestion', e);
        }
        return false;
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'OPEN': return <Badge variant="default">Novo</Badge>;
            case 'WAITING_INTERNAL': return <Badge variant="danger">Aguardando Operador</Badge>;
            case 'WAITING_CUSTOMER': return <Badge variant="outline">Aguardando Cliente</Badge>;
            case 'RESOLVED': return <Badge variant="success">Resolvido</Badge>;
            default: return <Badge variant="muted">{status}</Badge>;
        }
    };

    return (
        <div className="flex h-full w-full">
            {/* Left Sidebar - Chat List */}
            <div className="w-1/3 min-w-[300px] max-w-[400px] border-r border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] flex flex-col">
                <div className="p-4 border-b border-[hsl(var(--ui-border))] flex justify-between items-center bg-[hsl(var(--ui-bg-subtle))]">
                    <h2 className="font-semibold text-sm">Caixa de Entrada</h2>
                    <button onClick={fetchConversations} className="p-1 hover:bg-[hsl(var(--ui-border))] rounded-md transition-colors" title="Atualizar">
                        <RefreshCw className="w-4 h-4 text-[hsl(var(--ui-text-muted))]" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {loadingList ? (
                        <div className="p-4 text-center text-sm text-[hsl(var(--ui-text-muted))]">Carregando...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center text-sm text-[hsl(var(--ui-text-muted))] flex flex-col items-center">
                            <Check className="w-8 h-8 mb-2 opacity-20" />
                            Nenhuma conversa pendente
                        </div>
                    ) : (
                        conversations.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => setActiveConvId(c.id)}
                                className={`p-4 border-b border-[hsl(var(--ui-border))] cursor-pointer transition-colors ${activeConvId === c.id ? 'bg-[hsl(var(--ui-bg-hover))] border-l-2 border-l-[hsl(var(--ui-accent-blue))]' : 'hover:bg-[hsl(var(--ui-bg-hover))]'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-sm flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))]" />
                                        {c.phoneHash?.slice(0,8)}...
                                    </div>
                                    <span className="text-xs text-[hsl(var(--ui-text-muted))]">{format(new Date(c.lastMessageAt), 'HH:mm', { locale: ptBR })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={c.status} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Pane Container */}
            <div className="flex-1 flex bg-[hsl(var(--ui-bg-subtle))] min-w-0">
                {/* Active Conversation Chat */}
                <div className="flex-1 flex flex-col border-r border-[hsl(var(--ui-border))] min-w-0">
                    {activeConvId && activeConvDetails ? (
                    <>
                        <div className="p-5 border-b border-[hsl(var(--ui-border))] bg-white flex flex-col gap-4 shadow-sm z-10">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-900 block">{activeConvDetails.phone || `${activeConvDetails.phoneHash?.slice(0,8)}...`}</h3>
                                    </div>
                                    <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5 mt-1 ml-10">
                                        <Clock className="w-3.5 h-3.5" /> Última interação: {format(new Date(activeConvDetails.lastMessageAt), 'dd/MM/yyyy HH:mm')}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <StatusBadge status={activeConvDetails.status} />
                                </div>
                            </div>
                            
                            <div className="bg-gray-50/80 p-3 rounded-md border border-gray-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">Status Comercial (CRM)</span>
                                </div>
                                <PipelineActions 
                                    conversationId={activeConvId} 
                                    currentStage={activeConvDetails.stage || 'NEW'} 
                                    onStageChanged={() => {
                                        fetchMessages(activeConvId, true);
                                        fetchConversations();
                                    }} 
                                />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loadingMsgs && messages.length === 0 ? (
                                <div className="text-center text-sm text-[hsl(var(--ui-text-muted))]">Carregando mensagens...</div>
                            ) : messages.map(msg => {
                                const isInbound = msg.direction === 'INBOUND';
                                return (
                                    <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[75%] rounded-lg p-3 ${isInbound ? 'bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))]' : 'bg-[hsl(var(--ui-accent-blue))] text-white'}`}>
                                            <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                                            <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${isInbound ? 'text-[hsl(var(--ui-text-muted))]' : 'text-blue-100'}`}>
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(msg.createdAt), 'HH:mm', { locale: ptBR })}
                                                {!isInbound && <span className="ml-1 opacity-70">• {msg.source}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="px-4">
                            <FrankSuggestionPanel 
                                conversationId={activeConvId} 
                                onApproveAndSend={handleApproveAndSend} 
                            />
                        </div>

                        <div className="p-4 bg-[hsl(var(--ui-bg))] border-t border-[hsl(var(--ui-border))] mt-2">
                            <div className="flex gap-2">
                                <textarea 
                                    value={draftText}
                                    onChange={(e) => setDraftText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Digite sua resposta..."
                                    className="flex-1 resize-none rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-3 py-2 text-sm placeholder-[hsl(var(--ui-text-muted))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                    rows={2}
                                />
                                <button 
                                    onClick={handleSend}
                                    disabled={sending || !draftText.trim()}
                                    className="bg-[hsl(var(--ui-accent-blue))] hover:bg-[hsl(var(--ui-accent-blue-hover))] text-white p-3 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="mt-2 text-[10px] text-[hsl(var(--ui-text-muted))] flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Pressione Enter para enviar, Shift+Enter para quebrar linha. A mensagem será enviada via WhatsApp.
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[hsl(var(--ui-text-muted))] flex-col gap-3">
                        <User className="w-12 h-12 opacity-20" />
                        <span>Selecione uma conversa ao lado para iniciar o atendimento.</span>
                    </div>
                )}
                </div>

                {/* Third Pane - Context & Tools */}
                {activeConvId && activeConvDetails && (
                    <div className="w-80 flex-shrink-0 bg-[hsl(var(--ui-bg))] flex flex-col overflow-y-auto">
                        <div className="p-4 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))]">
                            <h3 className="font-semibold text-sm mb-3">Informações</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-[hsl(var(--ui-text-muted))]">
                                    <Phone className="w-4 h-4" /> 
                                    <span className="text-[hsl(var(--ui-text))]">{activeConvDetails.phone || activeConvDetails.phoneHash?.slice(0, 16)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[hsl(var(--ui-text-muted))]">
                                    <History className="w-4 h-4" /> 
                                    <span className="text-[hsl(var(--ui-text))]">Última att: {format(new Date(activeConvDetails.lastMessageAt), 'dd/MM HH:mm')}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Playbooks */}
                        <div className="p-4 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))]">
                            <PlaybookQuickActions entity="conversation" entityId={activeConvId} />
                        </div>

                        {/* Ferramentas de Frete e Orders */}
                        <div className="flex-1">
                            <DynamicFieldsRenderer entity="conversation" entityId={activeConvId} />
                            <OrderShipmentPanel conversationId={activeConvId} />
                            <FreightQuotePanel conversationId={activeConvId} />
                            
                            <div className="mt-4 border-t border-[hsl(var(--ui-border))] pt-4">
                                <TimelineFeed entityId={activeConvId} title="Timeline" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
