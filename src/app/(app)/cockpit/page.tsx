import { Suspense } from 'react';
import { headers } from 'next/headers';
import { SettingsPage } from '@/ui/settings';
import { getVisibleTiles } from '@/modules/cockpit/launcher/tiles.service';
import { LauncherGrid } from '@/ui/components/cockpit/launcher/LauncherGrid';
import { Role } from '@/ui/auth/entitlements-logic';

export default async function CockpitLauncherPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const roleStr = headersList.get('x-auth-role') || 'viewer';

    // Simple admin assertion logic currently coupled to UI routes
    const isSuperAdminUser = ['admin', 'owner'].includes(roleStr);

    // guard
    const actAsSuperAdmin = isSuperAdminUser && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    // Retrieve RBAC layout
    const { salas } = getVisibleTiles({
        tenantId,
        role: roleStr as Role
    });

    return (
        <SettingsPage
            title="Cockpit Operacional"
            description="Selecione um módulo para gerenciar as operações do tenant."
        >
            <Suspense fallback={
                <div className="flex w-full items-center justify-center p-12 text-[hsl(var(--ui-text-muted))]">
                    Carregando módulos...
                </div>
            }>
                <div className="-mx-2 sm:mx-0 py-4">
                    <LauncherGrid salas={salas} />
                </div>
            </Suspense>
        </SettingsPage>
    );
}
