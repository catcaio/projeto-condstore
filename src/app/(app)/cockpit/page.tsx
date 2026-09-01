import { headers } from 'next/headers';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { CockpitWorkspace } from './_components/CockpitWorkspace';

export const metadata = {
    title: 'Cockpit Operacional — CONDSTORE OS',
};

export const dynamic = 'force-dynamic';

export default async function CockpitPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role') || 'viewer';

    const actAsSuperAdmin = isSuperAdmin(role) && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--ui-page))] p-6 text-xs font-semibold text-[hsl(var(--ui-text-muted))]">
                Sessão/Tenant ID não encontrado.
            </div>
        );
    }

    return (
        <div className="min-h-full bg-[hsl(var(--ui-page))] px-3 py-4 text-[hsl(var(--ui-text))] sm:px-5 sm:py-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-[90rem]">
                <CockpitWorkspace role={role} tenantId={tenantId} />
            </div>
        </div>
    );
}
