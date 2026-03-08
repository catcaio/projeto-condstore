import { Metadata } from 'next';
import { FreightSimulatorClient } from './freight-simulator.client';

export const metadata: Metadata = {
    title: 'Simulador de Frete — Cockpit',
};

export default function FreightSimulatorPage() {
    return (
        <div className="p-6">
            <FreightSimulatorClient />
        </div>
    );
}
