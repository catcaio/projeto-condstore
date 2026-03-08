import { Metadata } from 'next';
import { EnviosClient } from './envios.client';

export const metadata: Metadata = {
    title: 'Painel de Envios — Logística',
    description: 'Lista de envios com tracking, transportadora e status financeiro',
};

export default function EnviosPage() {
    return (
        <main className="p-6 md:p-8">
            <EnviosClient />
        </main>
    );
}
