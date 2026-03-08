import { Metadata } from 'next';
import { RastreamentoClient } from './rastreamento.client';

export const metadata: Metadata = {
    title: 'Rastreamento — Logística',
    description: 'Timeline de status por envio',
};

export default function RastreamentoPage() {
    return (
        <main className="p-6 md:p-8">
            <RastreamentoClient />
        </main>
    );
}
