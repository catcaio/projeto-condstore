'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './button';
import { Users, Shield, BriefcaseBusiness, ArrowRight } from 'lucide-react';

export function AuthEntrySelector() {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    if (!open) {
        return (
            <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
                Entrar
            </Button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[hsl(var(--ui-surface))] w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 pb-0 mb-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                            Acessar CondStore
                        </h2>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-1">
                            Selecione seu perfil para ser direcionado ao ambiente correto.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 p-6 pt-0">
                    <button
                        onClick={() => { setOpen(false); router.push('/cliente'); }}
                        className="group relative flex items-center justify-between gap-4 rounded-xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface))] p-5 text-left transition-all hover:border-[hsl(var(--ui-accent-blue)/0.5)] hover:shadow-md"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[hsl(var(--ui-text))]">Sou Cliente</h3>
                                <p className="text-sm text-[hsl(var(--ui-text-muted))]">Acompanhe seus pedidos e cotações</p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-[hsl(var(--ui-text-muted))] transition-transform group-hover:translate-x-1 group-hover:text-[hsl(var(--ui-accent-blue))]" />
                    </button>

                    <button
                        onClick={() => { setOpen(false); router.push('/entrar'); }}
                        className="group relative flex items-center justify-between gap-4 rounded-xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface))] p-5 text-left transition-all hover:border-[hsl(var(--ui-accent-purple)/0.5)] hover:shadow-md"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--ui-accent-purple)/0.1)] text-[hsl(var(--ui-accent-purple))]">
                                <BriefcaseBusiness className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[hsl(var(--ui-text))]">Sou Funcionário</h3>
                                <p className="text-sm text-[hsl(var(--ui-text-muted))]">Acesse as ferramentas da sua operação</p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-[hsl(var(--ui-text-muted))] transition-transform group-hover:translate-x-1 group-hover:text-[hsl(var(--ui-accent-purple))]" />
                    </button>

                    <button
                        onClick={() => { setOpen(false); router.push('/gestao'); }}
                        className="group relative flex items-center justify-between gap-4 rounded-xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface))] p-5 text-left transition-all hover:border-[hsl(var(--ui-success)/0.5)] hover:shadow-md"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--ui-success)/0.1)] text-[hsl(var(--ui-success))]">
                                <Shield className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[hsl(var(--ui-text))]">Acessar Gestão</h3>
                                <p className="text-sm text-[hsl(var(--ui-text-muted))]">Painel de administração e relatórios</p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-[hsl(var(--ui-text-muted))] transition-transform group-hover:translate-x-1 group-hover:text-[hsl(var(--ui-success))]" />
                    </button>

                    <button
                        onClick={() => setOpen(false)}
                        className="mt-2 text-sm text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] mx-auto"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
