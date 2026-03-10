import { getDb } from '@/infra/db';
import { carrierPolicies } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getServerSessionUser } from '@/infra/auth/session';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/ui/components/PageHeader';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Truck, Settings2 } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Tabelas de Frete — Logística',
};

export default async function TabelasFretePage() {
    const session = await getServerSessionUser();
    if (!session) redirect('/login');

    const db = await getDb();
    const policies = await db
        .select()
        .from(carrierPolicies)
        .where(eq(carrierPolicies.tenantId, session.tenantId));

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Tabelas de Frete"
                subtitle="Gerencie as transportadoras ativas, suas zonas de cobertura, prazos e tarifas."
                actions={<Button variant="primary">Nova Transportadora</Button>}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {policies.map((policy) => (
                    <Card key={policy.id} className="hover:border-[hsl(var(--ui-border-active))] transition-colors">
                        <CardHeader
                            heading={
                                <div className="flex items-center gap-2 text-lg font-bold">
                                    <Truck className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                                    {policy.carrierName}
                                </div>
                            }
                            actions={
                                <Badge variant={policy.isActive ? 'success' : 'default'}>
                                    {policy.isActive ? 'Ativa' : 'Inativa'}
                                </Badge>
                            }
                        />
                        <CardContent>
                            <div className="flex flex-col gap-4">
                                <div className="text-sm text-[hsl(var(--ui-text-muted))]">
                                    <p>Origem: {policy.originCity} - {policy.originState}</p>
                                    <p>Prazo Base: {policy.deliveryTimeDaysBase} dias</p>
                                    <p>Fator Cubagem: {Number(policy.cubageFactor)}</p>
                                </div>

                                <Link href={`/logistica/tabelas-frete/${policy.carrierName.toLowerCase()}`} passHref>
                                    <Button variant="secondary" className="w-full flex justify-center items-center gap-2">
                                        <Settings2 className="w-4 h-4" />
                                        Configurar Tabelas
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {policies.length === 0 && (
                    <div className="col-span-full py-12 text-center text-[hsl(var(--ui-text-muted))] border border-dashed border-[hsl(var(--ui-border))] rounded-xl">
                        Nenhuma tabela de frete configurada para este lojista.
                    </div>
                )}
            </div>
        </div>
    );
}
