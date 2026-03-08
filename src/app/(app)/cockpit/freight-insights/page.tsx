import { Metadata } from 'next';
import { FreightInsightsClient } from './freight-insights.client';

export const metadata: Metadata = {
    title: 'Inteligência de Frete | Cockpit',
    description: 'Análise de desempenho e padrões de frete',
};

export default function FreightInsightsPage() {
    return (
        <main className="p-6 md:p-8">
            <FreightInsightsClient />
        </main>
    );
}
