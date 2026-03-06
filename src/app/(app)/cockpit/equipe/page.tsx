import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/infra/auth/session';
import { getDb } from '@/infra/db';
import { users, invites } from '@/drizzle/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { EquipeClient } from './equipe.client';
import { ShieldCheck, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Gestão de Equipe | Condstore OS',
};

export default async function EquipePage() {
    const session = await getServerSessionUser();
    if (!session) redirect('/login');

    if (session.role !== 'admin' && session.role !== 'manager') {
        redirect('/cockpit?error=unauthorized_role_management');
    }

    const db = await getDb();

    // Buscar membros do Tenant
    const teamMembers = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
            authProvider: users.authProvider,
        })
        .from(users)
        .where(eq(users.tenantId, session.tenantId))
        .orderBy(desc(users.createdAt));

    // Buscar convites pendentes do Tenant
    const pendingInvites = await db
        .select({
            id: invites.id,
            email: invites.email,
            role: invites.role,
            token: invites.token,
            expiresAt: invites.expiresAt,
            createdAt: invites.createdAt,
        })
        .from(invites)
        .where(
            and(
                eq(invites.tenantId, session.tenantId),
                isNull(invites.usedAt)
            )
        )
        .orderBy(desc(invites.createdAt));

    return (
        <main className="flex-1 overflow-y-auto bg-[hsl(var(--ui-background))] p-4 sm:p-6 lg:p-8">
            <div className="mx-auto flex flex-col w-full max-w-5xl gap-6">
                <header className="flex flex-col gap-4 border-b border-[hsl(var(--ui-border))] pb-6">
                    <Link href="/cockpit" className="group inline-flex items-center text-sm font-medium text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors w-fit">
                        <ChevronLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Voltar ao Cockpit
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="font-bold text-3xl text-[hsl(var(--ui-text))] tracking-tight flex items-center gap-3">
                                <ShieldCheck className="w-8 h-8 text-rose-500" />
                                Gestão de Equipe
                            </h1>
                            <p className="text-[hsl(var(--ui-text-muted))] mt-1">
                                Gerencie níveis de acesso, convites pendentes e delegue funções operacionais.
                            </p>
                        </div>
                    </div>
                </header>

                <EquipeClient
                    members={teamMembers}
                    invites={pendingInvites}
                    currentProvider={'email'}
                    currentUserId={session.sub}
                />
            </div>
        </main>
    );
}
