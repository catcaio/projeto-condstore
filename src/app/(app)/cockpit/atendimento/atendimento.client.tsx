'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, User, Clock, Check, RefreshCw, AlertCircle, Phone, History, X, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
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
    customer?: {
        name: string;
        document?: string;
    };
    contact?: any;
    organization?: any;
    recentOrders?: any[];
    recentQuotes?: any[];
    frankSession?: {
        currentIntent?: string;
        currentStep?: string;
        contextJson?: any;
    };
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
    const [creatingCustomer, setCreatingCustomer] = useState(false);
    
    // UI state
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isContextOpen, setIsContextOpen] = useState(false); // Controls 3rd pane on <2xl screens
    
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

    const handleCreateCustomer = async () => {
        if (!activeConvId) return;
        const name = prompt('Nome do contato/empresa:');
        if (!name) return;
        
        setCreatingCustomer(true);
        try {
            const res = await fetch(`/api/cockpit/conversations/${activeConvId}/customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                fetchMessages(activeConvId, true);
                fetchConversations();
            } else {
                alert('Erro ao criar cliente.');
            }
        } catch(e) {
            console.error(e);
            alert('Falha na requisição.');
        } finally {
            setCreatingCustomer(false);
        }
    };

    const handleApproveAndSend = async (text: string, suggestionId: string) => {
        if (!activeConvId) return false;
        try {
            const approveRes = await fetch(`/api/cockpit/frank/suggestions/${suggestionId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ finalResponse: text }),
            });
            if (approveRes.ok) {
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
        <div className="flex bg-[hsl(var(--ui-bg-subtle))] overflow-hidden absolute inset-0">
            {/* Left Sidebar - Chat List */}
            <div className={`
                border-r border-[hsl(var(--ui-border))] bg-white flex-col shrink-0 z-20 shadow-sm
                transition-all duration-300 ease-in-out h-full absolute inset-y-0 left-0
                md:relative md:flex md:w-[320px] 2xl:w-[360px]
                ${activeConvId ? (isSidebarOpen ? 'flex w-full md:w-[320px]' : 'hidden md:flex') : 'flex w-full md:w-[320px]'}
            `}>
                <div className="p-4 border-b border-[hsl(var(--ui-border))] flex justify-between items-center bg-gray-50/80 sticky top-0 z-10 shrink-0">
                    <h2 className="font-bold text-sm text-[hsl(var(--ui-text))]">Caixa de Entrada</h2>
                    <div className="flex items-center gap-1">
                        <button onClick={fetchConversations} className="p-1.5 hover:bg-white rounded-md transition-colors border border-transparent hover:border-gray-200 shadow-sm" title="Atualizar">
                            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button onClick={() => setIsSidebarOpen(false)} className="hidden md:flex p-1.5 hover:bg-white rounded-md transition-colors border border-transparent hover:border-gray-200 shadow-sm" title="Recolher lista">
                            <PanelLeftClose className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                    </div>
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
            <div className={`flex flex-1 min-w-0 overflow-hidden relative ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
                {/* Active Conversation Chat */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-50/30 overflow-hidden relative border-r border-transparent 2xl:border-[hsl(var(--ui-border))] shadow-[0_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
                    {activeConvId && activeConvDetails ? (
                    <>
                        <div className="p-4 md:px-6 md:py-4 border-b border-[hsl(var(--ui-border))] bg-white flex flex-col gap-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] z-10 shrink-0 relative">
                            <div className="flex justify-between items-center sm:items-start gap-2">
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2.5">
                                        {!isSidebarOpen && (
                                            <button 
                                                className="hidden md:flex mr-1 p-1.5 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
                                                onClick={() => setIsSidebarOpen(true)}
                                                title="Expandir Caixa de Entrada"
                                            >
                                                <PanelLeftOpen className="w-4 h-4 text-gray-700" />
                                            </button>
                                        )}
                                        <button 
                                            className="md:hidden mr-1 p-1.5 bg-gray-100 rounded-md"
                                            onClick={() => setActiveConvId(null)}
                                        >
                                            <X className="w-4 h-4 text-gray-700" />
                                        </button>
                                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 shadow-inner flex-shrink-0 flex items-center justify-center text-blue-700 font-bold overflow-hidden border border-blue-200/50">
                                            {activeConvDetails.customer?.name ? activeConvDetails.customer.name.charAt(0).toUpperCase() : <User className="w-4.5 h-4.5" />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="font-bold text-base md:text-[17px] text-gray-900 leading-tight truncate">
                                                {activeConvDetails.customer?.name || activeConvDetails.phone || `${activeConvDetails.phoneHash?.slice(0,8)}...`}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {activeConvDetails.customer?.name && (
                                                    <span className="text-xs text-[hsl(var(--ui-text-muted))] truncate">{activeConvDetails.phone}</span>
                                                )}
                                                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 hidden sm:flex">
                                                    <Clock className="w-3 h-3" /> {format(new Date(activeConvDetails.lastMessageAt), 'dd/MM/yyyy HH:mm')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                    <StatusBadge status={activeConvDetails.status} />
                                    <button 
                                        className={`2xl:hidden p-2 rounded-md transition-colors border shadow-sm flex items-center gap-1.5 text-xs font-medium ${isContextOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        onClick={() => setIsContextOpen(!isContextOpen)}
                                    >
                                        <PanelLeftClose className={`w-4 h-4 ${isContextOpen ? 'rotate-180' : ''} transition-transform`} />
                                        <span className="hidden sm:inline">{isContextOpen ? 'Fechar Contexto' : 'Painel de Contexto'}</span>
                                    </button>
                                </div>
                            </div>
                            
                            
                            <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-2.5 rounded-lg border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Pipeline de Vendas (CRM)</span>
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
                        
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-gradient-to-b from-gray-50/50 to-white">
                            {loadingMsgs && messages.length === 0 ? (
                                <div className="text-center text-sm text-[hsl(var(--ui-text-muted))]">Carregando mensagens...</div>
                            ) : messages.map(msg => {
                                const isInbound = msg.direction === 'INBOUND';
                                return (
                                    <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3.5 shadow-sm ${isInbound ? 'bg-white border text-gray-700' : 'bg-[#005c4b] text-[#e9edef] rounded-tr-sm border-none'}`}>
                                            <div className="text-[14.5px] whitespace-pre-wrap leading-relaxed">{msg.message}</div>
                                            <div className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${isInbound ? 'text-gray-400' : 'text-green-100/70'}`}>
                                                {format(new Date(msg.createdAt), 'HH:mm', { locale: ptBR })}
                                                {!isInbound && <span className="ml-1 opacity-80">• {msg.source}</span>}
                                                {!isInbound && <Check className="w-3 h-3 ml-0.5" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} className="h-4" />
                        </div>

                        <div className="px-3 md:px-6 shrink-0 z-10 sticky bottom-[116px] md:bottom-[132px]">
                            <FrankSuggestionPanel 
                                conversationId={activeConvId} 
                                onApproveAndSend={handleApproveAndSend} 
                            />
                        </div>

                        <div className="p-3 md:p-5 bg-gray-50 border-t border-[hsl(var(--ui-border))] shrink-0 z-20 sticky bottom-0">
                            <div className="flex gap-2 max-w-5xl mx-auto items-end bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                                <textarea 
                                    value={draftText}
                                    onChange={(e) => setDraftText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Digite sua mensagem ao cliente..."
                                    className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[14.5px] placeholder-gray-400 focus:outline-none max-h-32 min-h-[44px]"
                                    rows={1}
                                    style={{ height: draftText ? 'auto' : '44px' }}
                                />
                                <button 
                                    onClick={handleSend}
                                    disabled={sending || !draftText.trim()}
                                    className="bg-[#00a884] hover:bg-[#008f6f] text-white p-3 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0 mb-0.5 mr-0.5"
                                >
                                    {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 translate-x-0.5" />}
                                </button>
                            </div>
                            <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-center gap-1.5 max-w-5xl mx-auto">
                                <AlertCircle className="w-3 h-3" /> Pressione Enter para enviar, Shift+Enter para quebrar linha.
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[hsl(var(--ui-text-muted))] flex-col gap-4 bg-gray-50/50">
                        <div className="w-16 h-16 rounded-2xl bg-white border shadow-sm flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-gray-300" />
                        </div>
                        <span className="text-gray-500 font-medium">Selecione uma conversa ao lado para iniciar.</span>
                    </div>
                )}
                </div>

                {/* Third Pane - Context & Tools */}
                {activeConvId && activeConvDetails && (
                    <div className={`
                        absolute inset-y-0 right-0 z-30 shadow-2xl transition-transform duration-300 ease-in-out bg-white
                        w-[320px] sm:w-[380px] 2xl:w-[400px] border-l border-[hsl(var(--ui-border))]
                        2xl:relative 2xl:flex 2xl:shadow-none 2xl:translate-x-0
                        ${isContextOpen ? 'translate-x-0' : 'translate-x-full 2xl:translate-x-0'}
                        flex flex-col h-full overflow-hidden
                    `}>
                        <div className="p-4 border-b border-[hsl(var(--ui-border))] bg-gray-50/80 sticky top-0 z-10 shrink-0 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-[hsl(var(--ui-text))] flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-600" /> Contexto & Ferramentas
                            </h3>
                            <button 
                                className="2xl:hidden bg-white hover:bg-gray-100 p-1.5 rounded-md border text-gray-500 transition-colors shadow-sm"
                                onClick={() => setIsContextOpen(false)}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                        <div className="p-4 border-b border-[hsl(var(--ui-border))]">
                            <h3 className="font-semibold text-xs tracking-wider text-gray-500 uppercase mb-3">Informações</h3>
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

                        {/* Identidade do Cliente */}
                        <div className="p-4 border-b border-[hsl(var(--ui-border))] bg-white">
                            <h3 className="font-semibold text-sm mb-3">Identidade do Cliente</h3>
                            {activeConvDetails.customer ? (
                                <div className="text-sm">
                                    <p className="font-medium text-[hsl(var(--ui-text))]">{activeConvDetails.customer.name}</p>
                                    {activeConvDetails.organization && <p className="text-[hsl(var(--ui-text-muted))] text-xs mt-1">{activeConvDetails.organization.name}</p>}
                                </div>
                            ) : (
                                <div className="text-sm">
                                    <p className="text-[hsl(var(--ui-text-muted))] mb-3">Cliente não identificado no banco de dados.</p>
                                    <button 
                                        onClick={handleCreateCustomer}
                                        disabled={creatingCustomer}
                                        className="w-full bg-[hsl(var(--ui-accent-blue))] hover:bg-[hsl(var(--ui-accent-blue-hover))] text-white p-2 rounded-md transition-colors text-xs font-medium flex items-center justify-center disabled:opacity-50"
                                    >
                                        {creatingCustomer ? 'Criando...' : 'Criar Cliente a partir da conversa'}
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {/* Frank Context (Intent & Product) */}
                        {activeConvDetails.frankSession && (
                            <div className="p-4 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] space-y-3">
                                <h3 className="font-semibold text-sm">Contexto do Assistente</h3>
                                <div className="text-sm space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[hsl(var(--ui-text-muted))]">Intenção:</span>
                                        <Badge>{activeConvDetails.frankSession.currentIntent || 'Desconhecida'}</Badge>
                                    </div>
                                    {(activeConvDetails.frankSession.contextJson as any)?.activeProduct && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[hsl(var(--ui-text-muted))]">Produto:</span>
                                            <span className="font-medium truncate max-w-[150px]" title={(activeConvDetails.frankSession.contextJson as any).activeProduct}>
                                                {(activeConvDetails.frankSession.contextJson as any).activeProduct}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Playbooks */}
                        <div className="p-4 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))]">
                            <PlaybookQuickActions entity="conversation" entityId={activeConvId} />
                        </div>

                        {/* Ferramentas de Frete e Orders */}
                        <div className="flex-1">
                            <DynamicFieldsRenderer entity="conversation" entityId={activeConvId} />
                            <OrderShipmentPanel conversationId={activeConvId} />
                            <FreightQuotePanel conversationId={activeConvId} />
                            
                            <div className="mt-4 border-t border-[hsl(var(--ui-border))] px-4 pt-4 pb-8">
                                <TimelineFeed entityId={activeConvId} title="Timeline" />
                            </div>
                        </div>
                        </div>
                    </div>
                )}
                
                {/* Backdrop for mobile when drawer is open */}
                {isContextOpen && (
                    <div 
                        className="2xl:hidden absolute inset-0 bg-black/20 z-20 transition-opacity duration-300"
                        onClick={() => setIsContextOpen(false)}
                    />
                )}
            </div>
        </div>
    );
}
