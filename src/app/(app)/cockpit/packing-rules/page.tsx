import { Metadata } from 'next';
import { PackingRulesClient } from './packing-rules.client';

export const metadata: Metadata = {
    title: 'Regras de Empacotamento | Cockpit',
    description: 'Gerencie as regras operacionais de empacotamento e limites de volume',
};

export default function PackingRulesPage() {
    return (
        <main className="p-6 md:p-8">
            <PackingRulesClient />
        </main>
    );
}
