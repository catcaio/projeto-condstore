import { headers } from 'next/headers';
import { CockpitPage } from '@/ui/cockpit/layout/CockpitPage';
import { SecuritySettingsClient } from './_components/SecuritySettingsClient';

export default async function SecuritySettingsPage() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');

    if (!tenantId) return <div>Sem contexto</div>;

    return (
        <CockpitPage
            title="SECURITY & KEYS"
            description="Gerenciamento de integrações, tokens internos e criptografia."
        >
            <SecuritySettingsClient tenantId={tenantId} />
        </CockpitPage>
    );
}
