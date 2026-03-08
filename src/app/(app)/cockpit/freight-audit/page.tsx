import { Metadata } from 'next';
import { FreightAuditClient } from './freight-audit.client';

export const metadata: Metadata = {
    title: 'Auditoria de Frete | Cockpit',
    description: 'Histórico de simulações e confirmações de frete',
};

export default function FreightAuditPage() {
    return (
        <main className="p-6 md:p-8">
            <FreightAuditClient />
        </main>
    );
}
