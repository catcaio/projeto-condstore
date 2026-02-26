import { BookOpen, Key, Link2 } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Documentação',
    description: 'Comece a integrar a API de frete e rastreio da LojaCond na sua operação.',
};

export default function DocsPage() {
    return (
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-32 flex flex-col os-root">

            <div className="mb-16 max-w-2xl">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] mb-4">
                    Documentação
                </h1>
                <p className="text-lg text-[hsl(var(--ui-text-muted))]">
                    Integração simplificada via REST ou Webhooks. Tudo o que você precisa para começar a automatizar o frete.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl">

                <div className="flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-2xl p-6 hover:shadow-lg transition-shadow">
                    <div className="h-10 w-10 mb-4 rounded bg-[hsl(var(--ui-accent-blue)/0.1)] flex items-center justify-center text-[hsl(var(--ui-accent-blue))]">
                        <Key className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-[hsl(var(--ui-text))]">Autenticação</h2>
                    <p className="mt-2 flex-grow text-sm text-[hsl(var(--ui-text-muted))]">
                        Como obter sua Bearer API Key do cockpit e enviá-la via header nas requisições seguras.
                    </p>
                    <Link href="#" className="mt-6 text-sm font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline flex items-center gap-1 group">
                        Ler guia
                        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                </div>

                <div className="flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-2xl p-6 hover:shadow-lg transition-shadow">
                    <div className="h-10 w-10 mb-4 rounded bg-[hsl(var(--ui-success)/0.1)] flex items-center justify-center text-[hsl(var(--ui-success))]">
                        <Link2 className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-[hsl(var(--ui-text))]">Webhooks</h2>
                    <p className="mt-2 flex-grow text-sm text-[hsl(var(--ui-text-muted))]">
                        Configure endpoints HTTP para receber notificações em tempo real de mudança de status logístico.
                    </p>
                    <Link href="#" className="mt-6 text-sm font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline flex items-center gap-1 group">
                        Assinar Eventos
                        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                </div>

                <div className="flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-2xl p-6 hover:shadow-lg transition-shadow">
                    <div className="h-10 w-10 mb-4 rounded bg-[hsl(var(--ui-accent-purple)/0.1)] flex items-center justify-center text-[hsl(var(--ui-accent-purple))]">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-[hsl(var(--ui-text))]">API Reference</h2>
                    <p className="mt-2 flex-grow text-sm text-[hsl(var(--ui-text-muted))]">
                        Visão completa de todos os endpoints GET/POST e estruturas de Request/Response do core de frete.
                    </p>
                    <Link href="#" className="mt-6 text-sm font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline flex items-center gap-1 group">
                        Ver endpoints
                        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                </div>

            </div>
        </div>
    );
}
