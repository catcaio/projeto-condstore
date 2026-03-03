import { Suspense } from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { SettingsPage, SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge, Button } from '@/ui/components';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { getSimulationDetail, getSimulationFunnel } from '../queries';
import { SimulationDetailSkeleton } from '../components/skeletons';
import { ChevronLeft, Info, CalendarClock, Globe, Target, Fingerprint, MapPin, SearchCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const metadata = {
    title: 'Detalhes da Simulação — Condstore OS',
};

export default async function FreightSimulationDetailPage(props: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');

    const actAsSuperAdmin = isSuperAdmin(role) && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    return (
        <SettingsPage
            title="Detalhes da Simulação"
            description={`Log ID: ${params.id}`}
        >
            <div className="mb-6 px-4">
                <Link href={{ pathname: '/freight/simulations', query: inspectTenantId ? { tenantId: inspectTenantId } : {} }}>
                    <Button variant="ghost" className="text-xs text-[hsl(var(--ui-text-muted))] h-8 pl-1 pr-3 -ml-2 rounded-full hover:bg-[hsl(var(--ui-muted))]">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Voltar para Simulações
                    </Button>
                </Link>
            </div>

            <Suspense fallback={<SimulationDetailSkeleton />}>
                <SimulationDetailContent tenantId={tenantId} id={params.id} />
            </Suspense>
        </SettingsPage>
    );
}

async function SimulationDetailContent({ tenantId, id }: { tenantId: string, id: string }) {
    const sim = await getSimulationDetail(tenantId, id);

    if (!sim) {
        return (
            <div className="p-8 text-center text-sm text-[hsl(var(--ui-text-muted))]">
                Simulação não encontrada neste workspace.
            </div>
        );
    }

    const funnel = await getSimulationFunnel(tenantId, sim.refToken);

    // Status visual
    const isSuccess = Number(sim.valor) > 0;

    // Data display formating
    const displayDate = format(new Date(sim.createdAt), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR });

    return (
        <div className="flex flex-col gap-6">
            <SettingsSection title="Resumo">
                <SettingsRow
                    icon={<Info className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />}
                    label="Status"
                    value={<Badge variant={isSuccess ? "success" : "danger"}>{isSuccess ? "SUCCESS" : "FAILED"}</Badge>}
                />
                <SettingsRow
                    icon={<CalendarClock className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />}
                    label="Data da Cotação"
                    value={displayDate}
                />
                <SettingsRow
                    icon={<MapPin className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />}
                    label="Destino (UF)"
                    value={sim.uf}
                />
                <SettingsRow
                    icon={<Globe className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />}
                    label="Detalhes de Envio"
                    description="Peso cotado"
                    value={sim.peso ? `${Number(sim.peso).toFixed(2)} kg` : '--'}
                />
                {isSuccess && (
                    <SettingsRow
                        icon={<SearchCheck className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />}
                        label="Resultado"
                        description="Valores aproximados retornados"
                        value={`Prazo: ${sim.prazo} dias | Valor: R$${Number(sim.valor).toFixed(2)}`}
                    />
                )}
            </SettingsSection>

            {(sim.utmSource || sim.utmCampaign || sim.utmMedium) && (
                <SettingsSection title="Atribuição">
                    {sim.utmSource && <SettingsRow icon={<Target className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />} label="UTM Source" value={sim.utmSource} />}
                    {sim.utmCampaign && <SettingsRow icon={<Target className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />} label="UTM Campaign" value={sim.utmCampaign} />}
                    {sim.utmMedium && <SettingsRow icon={<Target className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />} label="UTM Medium" value={sim.utmMedium} />}
                    {sim.refToken && <SettingsRow icon={<Fingerprint className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />} label="Reference Token" description="ID usado no front-end" value={<span className="font-mono text-[10px] break-all max-w-[150px]">{sim.refToken}</span>} />}
                </SettingsSection>
            )}

            {funnel.length > 0 && (
                <SettingsSection title="Eventos do Funil Correlacionados">
                    {funnel.map((item, idx) => (
                        <SettingsRow
                            key={item.id}
                            icon={
                                <div className="flex bg-[hsl(var(--ui-muted))] rounded-full h-6 w-6 items-center justify-center font-bold text-xs">
                                    {funnel.length - idx}
                                </div>
                            }
                            label={<span className="font-semibold text-[13px]">{item.stage}</span>}
                            description={item.phoneNumber ? `Phone: ${item.phoneNumber}` : undefined}
                            value={<span className="text-[11px] text-[hsl(var(--ui-text-subtle))]">{format(new Date(item.createdAt), 'HH:mm:ss')}</span>}
                        />
                    ))}
                </SettingsSection>
            )}

            <SettingsSection title="Payload Original Sanitizado">
                <div className="p-4 mx-4 mt-2 mb-4 bg-[hsl(var(--ui-muted)/0.5)] rounded-lg overflow-x-auto border border-[hsl(var(--ui-border))]">
                    <pre className="text-[10px] font-mono leading-relaxed text-[hsl(var(--ui-text-muted))] whitespace-pre-wrap word-break-all">
                        {JSON.stringify({
                            id: sim.id,
                            tenantId: sim.tenantId,
                            cepHash: sim.cepHash,
                            clickId: sim.clickId,
                            timestamp: sim.createdAt
                        }, null, 2)}
                    </pre>
                </div>
            </SettingsSection>
        </div>
    );
}
