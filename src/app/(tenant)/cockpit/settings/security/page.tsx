import { headers } from 'next/headers';
import { SettingsPage } from '@/ui/settings';
import { SecuritySettingsClient } from './_components/SecuritySettingsClient';

export default async function SecuritySettingsPage() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');

    if (!tenantId) return <div>Sem contexto</div>;

    return (
        <SettingsPage
            title="Segurança e Chaves"
            description="Gerenciamento de integrações, tokens internos e criptografia."
        >
            <SecuritySettingsClient tenantId={tenantId} />
        </SettingsPage>
    );
}
