import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ClienteLogin() {
    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Login de Cliente</h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                    Acesse sua conta para acompanhar cotações e faturamentos
                </p>
            </div>

            {/* Placeholder Form */}
            <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-6 shadow-sm">
                <div className="text-sm text-center text-[hsl(var(--ui-text-muted))]">
                    Fomulário de Cliente [WIP]
                </div>
            </div>

            <div className="flex justify-center">
                <Link href="/login" className="flex items-center gap-2 text-sm text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para opções
                </Link>
            </div>
        </div>
    );
}
