import { Metadata } from 'next';
import { FreightMemoryClient } from './freight-memory.client';

export const metadata: Metadata = {
    title: 'Memória de Frete | Cockpit',
    description: 'Padrões de frete recorrentes e comportamento agregado',
};

export default function FreightMemoryPage() {
    return (
        <main className="p-6 md:p-8">
            <FreightMemoryClient />
        </main>
    );
}
