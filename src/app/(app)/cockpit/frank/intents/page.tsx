import type { Metadata } from 'next';
import { IntentLearningClient } from './intents.client';

export const metadata: Metadata = {
    title: 'Frank Intents | Cockpit',
    description: 'Validação e treinamento de intents a partir de conversas reais com o Frank.',
};

export default function FrankIntentsPage() {
    return (
        <main className="p-6 md:p-8">
            <IntentLearningClient />
        </main>
    );
}
