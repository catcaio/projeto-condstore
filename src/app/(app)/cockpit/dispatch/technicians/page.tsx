import { SettingsPage, SettingsSection } from '@/ui/settings';
import { getDb } from '../../../../../infra/db';
import { dispatchTechnicians } from '../../../../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { UserPlus, UserCircle, Trash2 } from 'lucide-react';

export default async function TechniciansPage() {
    const ENABLE_MVP = process.env.DISPATCH_MVP === 'true';

    if (!ENABLE_MVP) {
        return <SettingsPage title="Last-Mile Dispatch" description="Módulo Restrito">Restrito</SettingsPage>;
    }

    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');

    if (!tenantId) return <div>Sem contexto</div>;

    const db = await getDb();

    // Server action to create MVP tech
    async function createTech(formData: FormData) {
        'use server';
        const name = formData.get('name') as string;
        const phone = formData.get('phone') as string;

        if (!name || !phone) return;

        const db = await getDb();
        const tId = (await headers()).get('x-auth-tenant-id');
        if (!tId) return;

        await db.insert(dispatchTechnicians).values({
            id: crypto.randomUUID(),
            tenantId: tId,
            name,
            phone
        });

        revalidatePath('/cockpit/dispatch/technicians');
        redirect('/cockpit/dispatch'); // Redirect back to routing after setup
    }

    // Server action to delete tech
    async function deleteTech(formData: FormData) {
        'use server';
        const techId = formData.get('techId') as string;
        if (!techId) return;

        const db = await getDb();
        const tId = (await headers()).get('x-auth-tenant-id');
        if (!tId) return;

        await db.delete(dispatchTechnicians)
            .where(and(eq(dispatchTechnicians.id, techId), eq(dispatchTechnicians.tenantId, tId)));

        revalidatePath('/cockpit/dispatch/technicians');
    }

    const techs = await db.select()
        .from(dispatchTechnicians)
        .where(eq(dispatchTechnicians.tenantId, tenantId))
        .orderBy(desc(dispatchTechnicians.createdAt));

    return (
        <SettingsPage
            title="CADASTRO DE TÉCNICOS"
            description="Gerenciamento da frota de entregadores parceiros."
        >
            <SettingsSection title="Adicionar Técnico" description="Cadastre nomes e WhatsApp dos motoristas">
                <form action={createTech} className="flex gap-4 items-end bg-[hsl(var(--ui-surface))] p-4 rounded-lg border border-[hsl(var(--ui-border))]">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold mb-1 text-[hsl(var(--ui-text-muted))]">Nome Completo</label>
                        <input name="name" type="text" required placeholder="Ex: Carlos Silva" className="w-full border border-[hsl(var(--ui-border))] rounded px-3 py-2 text-sm bg-transparent" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-semibold mb-1 text-[hsl(var(--ui-text-muted))]">Telefone (WhatsApp)</label>
                        <input name="phone" type="text" required placeholder="11999999999" className="w-full border border-[hsl(var(--ui-border))] rounded px-3 py-2 text-sm bg-transparent" />
                    </div>
                    <button type="submit" className="bg-[hsl(var(--ui-primary))] text-white px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition">
                        <UserPlus className="w-4 h-4" /> Salvar
                    </button>
                </form>
            </SettingsSection>

            <SettingsSection title="Equipe Atual" description={`${techs.length} técnicos ativos`}>
                <div className="space-y-3">
                    {techs.length === 0 ? <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhum técnico cadastrado.</p> : (
                        techs.map(t => (
                            <div key={t.id} className="flex justify-between items-center p-4 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-lg">
                                <div className="flex items-center gap-3">
                                    <UserCircle className="w-8 h-8 text-[hsl(var(--ui-text-muted))]" />
                                    <div>
                                        <p className="font-semibold text-sm">{t.name}</p>
                                        <p className="text-xs text-[hsl(var(--ui-text-muted))]">{t.phone} • Status: {t.status}</p>
                                    </div>
                                </div>
                                <form action={deleteTech}>
                                    <input type="hidden" name="techId" value={t.id} />
                                    <button type="submit" className="text-red-500 hover:text-red-700 p-2" title="Remover Técnico">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        ))
                    )}
                </div>
            </SettingsSection>
        </SettingsPage>
    );
}
