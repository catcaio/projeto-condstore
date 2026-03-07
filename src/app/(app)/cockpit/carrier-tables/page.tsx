import { Metadata } from 'next';
import { CarrierTablesClient } from './carrier-tables.client';

export const metadata: Metadata = {
    title: 'Tabelas de Transportadoras — Cockpit',
};

export default function CarrierTablesPage() {
    return (
        <div className="p-6">
            <CarrierTablesClient />
        </div>
    );
}
