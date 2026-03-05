import { BookOpen, Key, Link2, Terminal } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Desenvolvedores | LojaCond',
    description: 'Integração de frete e rastreio para engenheiros de software.',
};

export default function DocsPage() {
    return (
        <div className="mx-auto max-w-6xl px-6 lg:px-8 py-20 lg:py-32 flex flex-col os-root">

            <div className="mb-20 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--ui-border)/0.5)] border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))] text-xs font-mono uppercase tracking-widest mb-6">
                    <Terminal className="w-3 h-3" />
                    Developers
                </div>
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] mb-6">
                    Integração <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(var(--ui-accent-blue-strong))]">Zero-Friction.</span>
                </h1>
                <p className="text-xl text-[hsl(var(--ui-text-muted))] font-light leading-relaxed">
                    Nossa API foi desenhada por engenheiros, para engenheiros. Se sua stack roda na borda, no servidor ou serverless, você implementa a LojaCond em um final de semana.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">

                {/* REST API CARD */}
                <div className="group flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-2xl p-8 hover:border-[hsl(var(--ui-accent-purple)/0.4)] transition-colors relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ui-accent-purple)/0.03)] to-transparent pointer-events-none" />
                    <div className="h-12 w-12 mb-6 rounded-xl bg-gradient-to-br from-[hsl(var(--ui-accent-purple)/0.15)] to-transparent border border-[hsl(var(--ui-accent-purple)/0.2)] flex items-center justify-center text-[hsl(var(--ui-accent-purple))]">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-[hsl(var(--ui-text))] mb-2">API Reference</h2>
                    <p className="flex-grow text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        Explore os endpoints RESTful de cotação de frete, geração de etiquetas e logística reversa via curl ou SDKs.
                    </p>
                    <Link href="#" className="mt-8 text-sm font-semibold text-[hsl(var(--ui-accent-purple))] hover:underline flex items-center gap-1">
                        Ler Documentação <span aria-hidden="true">→</span>
                    </Link>
                </div>

                {/* WEBHOOKS CARD */}
                <div className="group flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-2xl p-8 hover:border-[hsl(var(--ui-success)/0.4)] transition-colors relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ui-success)/0.03)] to-transparent pointer-events-none" />
                    <div className="h-12 w-12 mb-6 rounded-xl bg-gradient-to-br from-[hsl(var(--ui-success)/0.15)] to-transparent border border-[hsl(var(--ui-success)/0.2)] flex items-center justify-center text-[hsl(var(--ui-success))]">
                        <Link2 className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-[hsl(var(--ui-text))] mb-2">Webhooks</h2>
                    <p className="flex-grow text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        Inscreva-se em eventos de mudança de status (`DELIVERY.COMPLETED`) para atualizar seu banco de dados em tempo real.
                    </p>
                    <Link href="#" className="mt-8 text-sm font-semibold text-[hsl(var(--ui-success))] hover:underline flex items-center gap-1">
                        Assinar Eventos <span aria-hidden="true">→</span>
                    </Link>
                </div>

                {/* AUTENTICAÇÃO CARD */}
                <div className="group flex flex-col bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-2xl p-8 hover:border-[hsl(var(--ui-accent-blue)/0.4)] transition-colors relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ui-accent-blue)/0.03)] to-transparent pointer-events-none" />
                    <div className="h-12 w-12 mb-6 rounded-xl bg-gradient-to-br from-[hsl(var(--ui-accent-blue)/0.15)] to-transparent border border-[hsl(var(--ui-accent-blue)/0.2)] flex items-center justify-center text-[hsl(var(--ui-accent-blue))]">
                        <Key className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-[hsl(var(--ui-text))] mb-2">Autenticação</h2>
                    <p className="flex-grow text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        Entenda como gerar e gerenciar seus tokens `Bearer` a partir do Cockpit para autorizar chamadas sever-to-server.
                    </p>
                    <Link href="#" className="mt-8 text-sm font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline flex items-center gap-1">
                        Gerar API Key <span aria-hidden="true">→</span>
                    </Link>
                </div>

            </div>

            {/* QUICKSTART TERMINAL */}
            <div className="mt-20 w-full rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface-elevated))] overflow-hidden flex flex-col shadow-2xl">
                <div className="flex items-center px-4 py-3 bg-[hsl(var(--ui-border)/0.3)] border-b border-[hsl(var(--ui-border)/0.5)]">
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <div className="ml-4 text-xs text-[hsl(var(--ui-text-muted))] font-mono">Simulador de Frete (cURL)</div>
                </div>
                <div className="p-6 overflow-x-auto text-[13px] sm:text-sm font-mono leading-relaxed text-[hsl(var(--ui-text-subtle))]">
                    <span className="text-[hsl(var(--ui-accent-blue-strong))]">curl</span> -X POST https://api.condstoreos.com/v1/quotes \<br />
                    {' '} -H <span className="text-[hsl(var(--ui-success))]">"Authorization: Bearer sk_live_..."</span> \<br />
                    {' '} -H <span className="text-[hsl(var(--ui-success))]">"Content-Type: application/json"</span> \<br />
                    {' '} -d '{'{'}'<br />
                    {'   '}<span className="text-[hsl(var(--ui-accent-purple))]">"zipcode_from"</span>: <span className="text-yellow-100">"01001-000"</span>,<br />
                    {'   '}<span className="text-[hsl(var(--ui-accent-purple))]">"zipcode_to"</span>: <span className="text-yellow-100">"20040-002"</span>,<br />
                    {'   '}<span className="text-[hsl(var(--ui-accent-purple))]">"weight_kg"</span>: <span className="text-[#a78bfa]">1.5</span><br />
                    {' }'}
                </div>
            </div>

        </div>
    );
}
