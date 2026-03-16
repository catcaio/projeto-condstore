'use client';

import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { Search, Compass, MessageSquare, Truck, Users, Package, ArrowRight, BrainCircuit, PlusCircle, CheckCircle2, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createQuickOpportunity, approveAllPendingOrders, forceTrackingSync } from '@/modules/frank/actions/command-palette';

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(open => !open);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        } else {
            setSearch('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const navOptions = [
        { id: 'crm', label: 'CRM / Clientes', icon: <Users className="h-4 w-4" />, href: '/clientes' },
        { id: 'pedidos', label: 'Pedidos / Triagem', icon: <Package className="h-4 w-4" />, href: '/pedidos' },
        { id: 'logistica', label: 'Logística / Fila', icon: <Truck className="h-4 w-4" />, href: '/logistica' },
        { id: 'conversas', label: 'Conversas / Inbox', icon: <MessageSquare className="h-4 w-4" />, href: '/conversas' },
        { id: 'cockpit', label: 'Visão Geral (Cockpit)', icon: <Compass className="h-4 w-4" />, href: '/overview' },
    ];

    const filteredNav = navOptions.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

    const quickActions = [
        { id: 'act_opp', label: 'Nova Oportunidade CRM', icon: <PlusCircle className="h-4 w-4 text-emerald-500" /> },
        { id: 'act_approve', label: 'Aprovar Pendências', icon: <CheckCircle2 className="h-4 w-4 text-blue-500" /> },
        { id: 'act_track', label: 'Forçar Tracking Correios', icon: <Navigation className="h-4 w-4 text-amber-500" /> }
    ];

    const filteredActions = search.trim() === '' ? [] : quickActions.filter(a => a.label.toLowerCase().includes(search.toLowerCase()));

    const handleNavigate = (href: string) => {
        setIsOpen(false);
        router.push(href);
    };

    const handleAskFrank = () => {
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent('open-frank', { detail: { message: search } }));
    };

    const handleExecuteAction = async (action: any) => {
        setIsOpen(false);
        try {
            if (action.id === 'act_opp') await createQuickOpportunity();
            if (action.id === 'act_approve') await approveAllPendingOrders();
            if (action.id === 'act_track') await forceTrackingSync();
            // Fire generic toast if available or just log success for now
            console.log(`Successfully Executed: ${action.label}`);
        } catch (e: any) {
            console.error('Failed to execute Command Palette Action', e);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)} />
            
            <div className="relative w-full max-w-xl scale-100 overflow-hidden rounded-2xl bg-[hsl(var(--ui-page))] shadow-2xl ring-1 ring-[hsl(var(--ui-border))] transition-all mx-4">
                <div className="flex items-center border-b border-[hsl(var(--ui-border))] px-4 bg-[hsl(var(--ui-surface))]">
                    <Search className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />
                    <input 
                        ref={inputRef}
                        type="text"
                        placeholder="Pesquisar, pular para modulo ou perguntar ao Frank..."
                        className="flex h-14 w-full bg-transparent px-4 py-3 text-sm text-[hsl(var(--ui-text))] placeholder:text-[hsl(var(--ui-text-muted))] focus:outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (filteredNav.length > 0 && search.trim() === '') {
                                    handleNavigate(filteredNav[0].href);
                                } else if (search.trim() !== '') {
                                    handleAskFrank();
                                }
                            }
                        }}
                    />
                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold tracking-wider text-[hsl(var(--ui-text-subtle))]">
                        <kbd className="rounded bg-[hsl(var(--ui-muted))] px-2 py-0.5 uppercase">esc</kbd>
                    </div>
                </div>

                <div className="max-h-80 overflow-y-auto custom-scrollbar p-2">
                    {search.trim() !== '' && (
                        <div className="mb-2">
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))]">
                                Ações Inteligentes 🧠
                            </div>
                            <button
                                onClick={handleAskFrank}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[hsl(var(--ui-accent-blue)/0.1)] hover:text-[hsl(var(--ui-accent-blue-ink))]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--ui-accent-blue)/0.2)] text-[hsl(var(--ui-accent-blue-ink))]">
                                        <BrainCircuit className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Perguntar ao Frank sobre:</span>
                                        <span className="text-xs text-[hsl(var(--ui-text-muted))] line-clamp-1 text-left">"{search}"</span>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 opacity-50" />
                            </button>
                        </div>
                    )}

                    {filteredActions.length > 0 && (
                        <div className="mb-2">
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))]">
                                Ações de Workflow
                            </div>
                            <div className="space-y-1">
                                {filteredActions.map((action) => (
                                    <button
                                        key={action.id}
                                        onClick={() => handleExecuteAction(action)}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-surface))] hover:text-[hsl(var(--ui-text))] transition-colors"
                                    >
                                        <div className="flex h-7 w-7 items-center justify-center rounded border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))]">
                                            {action.icon}
                                        </div>
                                        <span>{action.label}</span>
                                        <span className="ml-auto text-[10px] uppercase font-bold text-[hsl(var(--ui-text-subtle))] bg-[hsl(var(--ui-page))] px-1.5 py-0.5 rounded border border-[hsl(var(--ui-border))]">
                                            Run
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {filteredNav.length > 0 && (
                        <div>
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))]">
                                Navegacao Rápida
                            </div>
                            <div className="space-y-1">
                                {filteredNav.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => handleNavigate(option.href)}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-surface))] hover:text-[hsl(var(--ui-text))] transition-colors"
                                    >
                                        <div className="flex h-7 w-7 items-center justify-center rounded border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))]">
                                            {option.icon}
                                        </div>
                                        <span>{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {filteredNav.length === 0 && search.trim() === '' && (
                        <div className="px-4 py-8 text-center text-sm text-[hsl(var(--ui-text-muted))]">
                            Nenhum resultado encontrado para "{search}".
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
