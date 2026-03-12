import type { Metadata } from 'next';
import { FrankAssistCockpitClient } from './frank.client';

export const metadata: Metadata = {
    title: 'Frank Assistente | Cockpit',
    description: 'Observabilidade operacional do atendimento assistido pelo Frank.',
};

export default function FrankAssistCockpitPage() {
    return (
        <main className="p-6 md:p-8">
            <FrankAssistCockpitClient />
        </main>
    );
}
