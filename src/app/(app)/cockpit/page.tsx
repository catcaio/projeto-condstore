import { headers } from 'next/headers';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { getCockpitData } from '@/modules/cockpit/data/get-cockpit-data';
import { CockpitWorkspaceShell } from '@/modules/cockpit/workspace/workspace-shell';

export const metadata = {
    title: 'Cockpit Operacional — CONDSTORE OS',
};

export const dynamic = 'force-dynamic';

export default async function CockpitPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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

    const cockpitData = await getCockpitData();

    return <CockpitWorkspaceShell data={cockpitData} />;
}
