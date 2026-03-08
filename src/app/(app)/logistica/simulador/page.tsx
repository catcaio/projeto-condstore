import { Metadata } from 'next';
import { FreightSimulatorClient } from '../../cockpit/freight-simulator/freight-simulator.client';

export const metadata: Metadata = {
    title: 'Simulador de Frete — Logística',
    description: 'Simular cotação de frete por CEP, peso e dimensões',
};

export default function SimuladorPage() {
    return (
        <main className="p-6 md:p-8">
            <FreightSimulatorClient />
        </main>
    );
}
