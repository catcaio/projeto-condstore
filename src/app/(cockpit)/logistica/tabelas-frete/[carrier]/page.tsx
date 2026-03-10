import { getDb } from '@/infra/db';
import { carrierPolicies, carrierZones, carrierRateRows } from '@/drizzle/schema';
import { eq, and, asc } from 'drizzle-orm';
import { requireTenantSession } from '@/infra/auth/session-helpers';
import { PageHeader } from '@/ui/components/PageHeader';
import { Truck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PolicyEditor, ZonesEditor, RatesEditor } from './editors';

export async function generateMetadata({ params }: { params: { carrier: string } }) {
    return { title: `Refinar ${params.carrier.toUpperCase()} — Logística` };
}

export default async function CarrierDetailsPage({ params }: { params: { carrier: string } }) {
    const session = await requireTenantSession();
    const db = await getDb();

    const carrierKey = params.carrier.toUpperCase();

    const [policy] = await db.select().from(carrierPolicies).where(and(
        eq(carrierPolicies.tenantId, session.tenantId),
        eq(carrierPolicies.carrierName, carrierKey)
    )).limit(1);

    if (!policy) {
        notFound();
    }

    const zones = await db.select().from(carrierZones).where(and(
        eq(carrierZones.tenantId, session.tenantId),
        eq(carrierZones.carrierName, carrierKey)
    )).orderBy(asc(carrierZones.state), asc(carrierZones.zoneCode));

    const rates = await db.select().from(carrierRateRows).where(and(
        eq(carrierRateRows.tenantId, session.tenantId),
        eq(carrierRateRows.carrierName, carrierKey)
    )).orderBy(asc(carrierRateRows.zoneCode), asc(carrierRateRows.weightBandMax));

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
            <PageHeader
                title={`Parametrização: ${carrierKey}`}
                description="Ajuste as regras de cálculo, faixas de CEP e tarifas aplicadas no Checkout para esta transportadora."
                icon={Truck}
                backHref="/logistica/tabelas-frete"
            />

            <div className="grid grid-cols-1 gap-6">
                <PolicyEditor carrierName={carrierKey} initialPolicy={policy} />
                <ZonesEditor carrierName={carrierKey} zones={zones} />
                <RatesEditor carrierName={carrierKey} rates={rates} />
            </div>
        </div>
    );
}
