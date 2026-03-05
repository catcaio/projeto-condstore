import { Metadata } from 'next';
import { PlataformaClient } from './plataforma-client';

export const metadata: Metadata = {
    title: 'Plataforma: Cockpit ou Headless — Condstore OS',
    description: 'Escolha como construir sua operação logística corporativa: use nossa interface pronta (Cockpit) ou integre via API (Headless).',
    robots: {
        index: true,
        follow: true,
    },
};

export default function PlataformaPage() {
    return (
        <main className="min-h-screen bg-[hsl(var(--ui-bg))]">
            <PlataformaClient />
        </main>
    );
}
