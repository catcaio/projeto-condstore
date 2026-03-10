import { getDb } from '@/infra/db';
import { carrierPolicies, carrierZones, carrierRateRows } from '@/drizzle/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getServerSessionUser } from '@/infra/auth/session';
import { PageHeader } from '@/ui/components/PageHeader';
import { notFound, redirect } from 'next/navigation';
import { PolicyEditor, ZonesEditor, RatesEditor } from '../editors';
import Link from 'next/link';
import { Button } from '@/ui/components/button';

export async function generateMetadata({ params }: { params: { carrier: string } }) {
    return { title: `Refinar ${params.carrier.toUpperCase()} — Logística` };
}

export default async function CarrierDetailsPage({ params }: { params: { carrier: string } }) {
    const session = await getServerSessionUser();
    if (!session) redirect('/login');

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
                subtitle="Ajuste as regras de cálculo, faixas de CEP e tarifas aplicadas no Checkout para esta transportadora."
                actions={
                    <Link href="/logistica/tabelas-frete" passHref>
                        <Button variant="secondary">Voltar</Button>
                    </Link>
                }
            />

            <div className="grid grid-cols-1 gap-6">
                <PolicyEditor carrierName={carrierKey} initialPolicy={policy} />
                <ZonesEditor carrierName={carrierKey} zones={zones} />
                <RatesEditor carrierName={carrierKey} rates={rates} />
            </div>
        </div>
    );
}
