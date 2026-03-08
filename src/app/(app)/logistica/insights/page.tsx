import { Metadata } from 'next';
import { InsightsClient } from './insights.client';

export const metadata: Metadata = {
    title: 'Insights de Frete — Logística',
    description: 'Inteligência logística: CEPs, transportadoras e rotas mais usadas',
};

export default function InsightsPage() {
    return (
        <main className="p-6 md:p-8">
            <InsightsClient />
        </main>
    );
}
