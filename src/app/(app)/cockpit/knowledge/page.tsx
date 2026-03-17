import { Suspense } from 'react';
import { headers } from 'next/headers';
import { SettingsPage, SettingsSection } from '@/ui/settings';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { UploadCard } from './components/upload-card';
import { DocumentsList } from './components/documents-list';
import { planEnforcementService } from '@/modules/finops';

export default async function KnowledgeInboxPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    // Also parse pagination params
    const pageStr = typeof searchParams.page === 'string' ? searchParams.page : '1';
    const page = parseInt(pageStr, 10) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');

    // guard
    const actAsSuperAdmin = isSuperAdmin(role) && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    const planData = await planEnforcementService.getPlanStatus(tenantId);

    const maxFilesMsgs = `Máximo de ${planData.limits.knowledge_max_files_per_month} por mês. (Atual: ${planData.usage.freight_simulations_per_month /* temporary proxy until usage is 100% split */})`;
    const usageCard = (
        <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-md p-4 mb-6">
            <h3 className="text-sm font-semibold mb-2">Uso da Base (Plano: {planData.plan})</h3>
            <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                {planData.limits.knowledge_max_file_size_bytes / 1024 / 1024}MB por arquivo.<br />
                {maxFilesMsgs}
            </p>
        </div>
    );

    return (
        <SettingsPage
            title="Frank Knowledge Inbox"
            description="Central de gestão de conhecimento do agente IA (Upload, Catalog, Configuração)"
        >
            {usageCard}

            <SettingsSection title="Upload de novo documento">
                <UploadCard tenantId={tenantId} maxSizeBytes={planData.limits.knowledge_max_file_size_bytes} />
            </SettingsSection>

            <SettingsSection title="Acervo de Documentos">
                <Suspense fallback={<div className="p-4 text-center">Carregando acervo...</div>}>
                    {/* Documents list fetches via Server Component fetch or DB directly. We will pass params */}
                    <DocumentsList tenantId={tenantId} limit={limit} offset={offset} />
                </Suspense>
            </SettingsSection>

        </SettingsPage>
    );
}
