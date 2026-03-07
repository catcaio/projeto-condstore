import { headers } from 'next/headers';
import { PackingProfilesClient } from './packing-profiles.client';

export const metadata = {
    title: 'Perfis de Embalagem — Condstore OS',
};

export default async function PackingProfilesPage() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role') || 'viewer';

    if (!tenantId) {
        return <div className="p-8 text-[hsl(var(--ui-text-muted))]">Tenant ID não encontrado.</div>;
    }

    if (!['admin', 'manager'].includes(role)) {
        return (
            <div className="p-8 text-center text-[hsl(var(--ui-text-muted))]">
                <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                <p>Apenas administradores e gerentes podem acessar os perfis de embalagem.</p>
            </div>
        );
    }

    return (
        <main className="flex-1 flex flex-col min-h-0 bg-[hsl(var(--ui-background))] overflow-hidden">
            <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-6xl flex flex-col gap-6">
                    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--ui-text))] tracking-tight">
                                Perfis de Embalagem
                            </h1>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-1">
                                Gerencie as dimensões e regras de embalagem dos seus produtos
                            </p>
                        </div>
                    </header>

                    <PackingProfilesClient />
                </div>
            </div>
        </main>
    );
}
