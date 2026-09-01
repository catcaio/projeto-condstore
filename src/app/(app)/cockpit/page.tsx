import { rooms } from '@/modules/cockpit';
import { RoomCard } from '@/ui/cockpit/room-card';
import { headers } from 'next/headers';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { CockpitOperationalDashboard } from './_components/CockpitOperationalDashboard';

export const metadata = {
    title: 'Cockpit Operacional — CONDSTORE OS',
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
        return (
            <div className="p-6 text-xs font-semibold text-[hsl(var(--ui-text-muted))] bg-[hsl(var(--ui-page))] min-h-screen flex items-center justify-center">
                Sessão/Tenant ID não encontrado.
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto bg-[hsl(var(--ui-page))] p-4 sm:p-6 lg:p-8 min-h-screen text-[hsl(var(--ui-text))]">
            <div className="mx-auto max-w-7xl space-y-8">
                <CockpitOperationalDashboard tenantId={tenantId} />

                <div className="pt-8 mt-8 border-t border-[hsl(var(--ui-border)/0.5)]">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[hsl(var(--ui-text-subtle))] mb-4">
                        Salas de Operação Especializadas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                        {rooms.map((room) => (
                            <RoomCard key={room.id} {...room} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
