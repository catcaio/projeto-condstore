import { Metadata } from 'next';
import { AvaliacaoClient } from './avaliacao-client';

export const metadata: Metadata = {
    title: 'Avalie sua Operação — Condstore OS',
    description: 'Descubra como o Condstore OS pode automatizar seus fretes, logística reversa ou gestão comercial B2B.',
    robots: {
        index: true,
        follow: true,
    },
};

export default function AvaliacaoPage() {
    return (
        <main className="min-h-screen bg-[hsl(var(--ui-bg))] flex flex-col">
            <AvaliacaoClient />
        </main>
    );
}
