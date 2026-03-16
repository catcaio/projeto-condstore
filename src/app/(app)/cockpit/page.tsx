import { rooms } from '@/modules/cockpit/rooms/rooms.registry';
import { RoomCard } from '@/ui/cockpit/room-card';
import { PageHeader } from '@/ui/components/PageHeader';
import { headers } from 'next/headers';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { EcosystemChangePanel } from '@/ui/cockpit/ecosystem-change-panel';
import { Suspense } from 'react';

export const metadata = {
    title: 'Launcher Operacional — CONDSTORE OS',
};

export const dynamic = 'force-dynamic';

export default async function CockpitPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');

    // guard
    const actAsSuperAdmin = isSuperAdmin(role) && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    return (
        <div className="flex-1 overflow-auto bg-gray-50/50 p-6">
            <div className="mx-auto max-w-7xl space-y-8">
                <PageHeader 
                    title="Launcher Operacional" 
                    subtitle="Bem-vindo ao centro de controle. Selecione a sala de trabalho desejada."
                />
                
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {rooms.map((room) => (
                                <RoomCard key={room.id} {...room} />
                            ))}
                        </div>
                    </div>
                    
                    <div className="xl:col-span-1">
                        <Suspense fallback={<div className="h-64 rounded-xl bg-gray-100 animate-pulse w-full"></div>}>
                            <EcosystemChangePanel tenantId={tenantId} />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
