'use client';

import * as React from 'react';
import { Bot, Sparkles, Minimize2, Send, ExternalLink, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { useFrankContext } from './use-frank-context';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface HumanGateData {
    stepId: string;
    action: string;
    payload?: {
        title?: string;
        description?: string;
        details?: Record<string, unknown>;
    };
}

interface FrankMessage {
    id: string;
    role: 'assistant' | 'user';
    text: string;
    status?: string;
    humanGate?: HumanGateData;
    suggestions?: Array<{ label: string; actionUrl: string }>;
}

export function FrankGlobalWidget({ tenantId }: { tenantId: string | null }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const context = useFrankContext();
    const router = useRouter();
    const [messages, setMessages] = React.useState<FrankMessage[]>([
        { id: '1', role: 'assistant', text: 'Olá! Sou o Frank, assistente operacional supervisionado do CONDSTORE OS. Como posso ajudar com os dados reais do sistema hoje?' }
    ]);
    const [input, setInput] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
    const [activeExecutionId, setActiveExecutionId] = React.useState<string | null>(null);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen, statusMessage]);

    React.useEffect(() => {
        const handleOpenFrank = (e: CustomEvent<{ message?: string }>) => {
            setIsOpen(true);
            if (e.detail?.message) {
                setInput(e.detail.message);
                inputRef.current?.focus();
            }
        };
        window.addEventListener('open-frank', handleOpenFrank as EventListener);
        return () => window.removeEventListener('open-frank', handleOpenFrank as EventListener);
    }, []);

    const handleToggle = () => setIsOpen((prev) => !prev);

    const sendChatMessage = async (userText: string, humanApproval?: { stepId: string; approved: boolean }) => {
        if (isLoading) return;

        setIsLoading(true);
        setStatusMessage('Conectando ao Frank Supremo...');

        if (userText) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
        }

        const assistantMsgId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', text: '' }]);

        try {
            const response = await fetch('/api/cockpit/frank/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText || '',
                    context: {
                        module: context.moduleName,
                        entityId: context.entityId || undefined,
                        readableContext: context.readableContext,
                    },
                    executionId: activeExecutionId || undefined,
                    humanApproval,
                }),
            });

            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                throw new Error(errJson.error || 'Falha na resposta do Frank.');
            }

            if (!response.body) {
                throw new Error('Streaming não suportado.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const jsonStr = line.replace(/^data:\s*/, '').trim();
                    if (!jsonStr) continue;

                    try {
                        const event = JSON.parse(jsonStr);

                        if (event.type === 'status') {
                            setStatusMessage(event.message || 'Processando...');
                        } else if (event.type === 'tool_call') {
                            setStatusMessage(`Consultando ferramenta: ${event.tool}...`);
                        } else if (event.type === 'evidence') {
                            setStatusMessage('Evidências do banco de dados recebidas.');
                        } else if (event.type === 'human_gate_required') {
                            setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
                                ...m,
                                humanGate: {
                                    stepId: event.stepId,
                                    action: event.action,
                                    payload: event.payload,
                                }
                            } : m));
                        } else if (event.type === 'chunk') {
                            accumulatedText += event.content || '';
                            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulatedText } : m));
                        } else if (event.type === 'done') {
                            if (event.executionId) {
                                setActiveExecutionId(event.executionId);
                            }
                            setStatusMessage(null);
                        } else if (event.type === 'error') {
                            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: `⚠️ ${event.error}` } : m));
                            setStatusMessage(null);
                        }
                    } catch {}
                }
            }
        } catch (error: any) {
            const errorMsg = error instanceof Error ? error.message : 'Erro na comunicação';
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: `⚠️ ${errorMsg}` } : m));
        } finally {
            setIsLoading(false);
            setStatusMessage(null);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;
        const text = input.trim();
        setInput('');
        await sendChatMessage(text);
    };

    const handleHumanGateAction = async (stepId: string, approved: boolean) => {
        await sendChatMessage('', { stepId, approved });
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
            {isOpen && (
                <div className="mb-4 flex flex-col h-[520px] w-[380px] sm:w-[420px] rounded-2xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] shadow-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-5">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--ui-border))] bg-gradient-to-r from-[hsl(var(--ui-surface))] to-blue-50/50 dark:to-blue-900/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm ring-2 ring-white/20">
                                <Bot size={22} className={isLoading ? "animate-pulse" : ""} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[hsl(var(--ui-text))]">Frank Global</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <p className="text-[11px] font-medium text-[hsl(var(--ui-text-muted))]">
                                        Foco: {context.moduleName}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={handleToggle} className="p-2 text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-bg))] rounded-lg transition-colors">
                                <Minimize2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[hsl(var(--ui-page))]">
                        <div className="flex items-center gap-2 mb-6">
                            <Sparkles size={14} className="text-blue-500" />
                            <span className="text-xs font-semibold text-blue-500 tracking-wider uppercase">Assistente Operacional Real</span>
                            <div className="h-px flex-1 bg-[hsl(var(--ui-border))]"></div>
                        </div>

                        {messages.map((m) => (
                            <div key={m.id} className={cn("flex flex-col max-w-[90%]", m.role === 'user' ? "items-end ml-auto" : "items-start mr-auto")}>
                                <div className={cn(
                                    "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap",
                                    m.role === 'user'
                                        ? "bg-blue-600 text-white rounded-br-sm shadow-md"
                                        : "bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))] border border-[hsl(var(--ui-border))] rounded-bl-sm shadow-sm"
                                )}>
                                    {m.text}
                                </div>

                                {/* Human Gate Approval Card */}
                                {m.humanGate && (
                                    <div className="mt-3 w-full rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 shadow-sm">
                                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs mb-1">
                                            <ShieldAlert size={16} />
                                            <span>{m.humanGate.payload?.title || 'Aprovação de Segurança Necessária'}</span>
                                        </div>
                                        <p className="text-[12px] text-amber-900 dark:text-amber-200 mb-3 leading-snug">
                                            {m.humanGate.payload?.description || 'Esta ação requer validação humana pelo Human Gate.'}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleHumanGateAction(m.humanGate!.stepId, true)}
                                                disabled={isLoading}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                <CheckCircle2 size={14} />
                                                <span>Aprovar</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleHumanGateAction(m.humanGate!.stepId, false)}
                                                disabled={isLoading}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                <XCircle size={14} />
                                                <span>Rejeitar</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {m.suggestions && m.suggestions.length > 0 && (
                                    <div className="flex flex-col gap-1.5 mt-2 w-full">
                                        {m.suggestions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    router.push(action.actionUrl);
                                                }}
                                                className="flex items-center justify-between gap-2 px-3 py-2 bg-[hsl(var(--ui-surface))] border border-blue-200 text-blue-700 hover:bg-blue-50 text-[12px] font-semibold rounded-lg shadow-sm transition-colors text-left"
                                            >
                                                <span>{action.label}</span>
                                                <ExternalLink size={14} className="opacity-50" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex flex-col items-start mr-auto max-w-[85%]">
                                <div className="px-3 py-2 rounded-2xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-bl-sm shadow-sm flex items-center gap-2 text-xs text-[hsl(var(--ui-text-muted))]">
                                    <span className="flex gap-1">
                                        <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                                    </span>
                                    <span>{statusMessage || 'Frank está analisando...'}</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]">
                        <form onSubmit={handleSend} className="relative flex items-center">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Pergunte sobre estado do sistema, erros ou pedidos..."
                                className="flex-1 min-w-0 bg-transparent text-sm text-[hsl(var(--ui-text))] placeholder:text-[hsl(var(--ui-text-subtle))] focus:outline-none pr-8"
                                disabled={isLoading}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 disabled:text-gray-400 disabled:hover:bg-transparent rounded-lg transition-colors"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                        <div className="flex flex-wrap gap-2 mt-3 mb-1 px-1">
                            <button type="button" onClick={() => sendChatMessage('Frank, qual é o estado do sistema?')} className="text-[10px] font-medium border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors px-2 py-1 rounded-full text-[hsl(var(--ui-text-muted))]">
                                Estado do sistema
                            </button>
                            <button type="button" onClick={() => sendChatMessage('Existem erros recentes?')} className="text-[10px] font-medium border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors px-2 py-1 rounded-full text-[hsl(var(--ui-text-muted))]">
                                Erros recentes
                            </button>
                            <button type="button" onClick={() => sendChatMessage('Frank, mostre as últimas execuções.')} className="text-[10px] font-medium border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors px-2 py-1 rounded-full text-[hsl(var(--ui-text-muted))]">
                                Últimas execuções
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Frank Toggle Button */}
            {!isOpen && (
                <button
                    onClick={handleToggle}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={cn(
                        "group flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform",
                        "bg-gradient-to-b from-blue-500 to-blue-700 hover:shadow-blue-500/50 hover:-translate-y-1"
                    )}
                >
                    <div className="absolute inset-0 rounded-full ring-2 ring-white/20 inset-ring-1 inset-ring-white/10 group-hover:ring-white/40 transition-all"></div>
                    <Bot size={28} className="text-white drop-shadow-sm" />

                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-[hsl(var(--ui-surface))]"></span>
                    </span>
                </button>
            )}

            {/* Tooltip for button */}
            {!isOpen && isHovered && (
                 <div className="absolute right-16 bottom-2 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-right-2">
                     Frank Global Assist
                     <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 border-y-4 border-y-transparent border-l-4 border-l-gray-900"></div>
                 </div>
            )}

        </div>
    );
}
