import { getDb } from '@/infra/db';
import { carrierPolicies, carrierZones, carrierRateRows } from '@/drizzle/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getServerSessionUser } from '@/infra/auth/session';
import { PageHeader } from '@/ui/components/PageHeader';
import { notFound, redirect } from 'next/navigation';
import { PolicyEditor, ZonesEditor, RatesEditor } from '../editors';
import Link from 'next/link';
import { Button } from '@/ui/components/button';

/** Convert a URL slug back to find the matching carrier name.
 *  e.g. "melhor-envio" matches "Melhor Envio", "MENGUE" matches "mengue" */
function slugMatchesCarrier(slug: string, carrierName: string): boolean {
    return carrierName.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase();
}

/** Convert carrier name to URL slug */
function toSlug(carrierName: string): string {
    return carrierName.toLowerCase().replace(/\s+/g, '-');
}

export async function generateMetadata({ params }: { params: Promise<{ carrier: string }> }) {
    const { carrier } = await params;
    return { title: `Refinar ${carrier.toUpperCase()} — Logística` };
}

export default async function CarrierDetailsPage({ params }: { params: Promise<{ carrier: string }> }) {
    const { carrier: slug } = await params;
    const session = await getServerSessionUser();
    if (!session) redirect('/login');

    const db = await getDb();

    // Fetch all policies for this tenant and match by slug (case-insensitive, space→dash)
    const allPolicies = await db.select().from(carrierPolicies)
        .where(eq(carrierPolicies.tenantId, session.tenantId));

    const policy = allPolicies.find(p => slugMatchesCarrier(slug, p.carrierName));

    if (!policy) {
        notFound();
    }

    const carrierKey = policy.carrierName;

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
