import Sidebar from './_components/sidebar';
import CommandBar from './_components/command-bar';
import { headers } from 'next/headers';
import { getDb } from '@/infra/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { SessionProvider } from '@/ui/context/SessionContext';
import { type Role } from '@/ui/auth/entitlements-logic';
import { redirect } from 'next/navigation';

export default async function CockpitLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Trust x-auth-* headers injected by proxy.ts middleware (JWT already verified)
    const headersList = await headers();
    const userId = headersList.get('x-auth-user-id');
    const tenantId = headersList.get('x-auth-tenant-id');
    const role = (headersList.get('x-auth-role') || 'viewer') as Role;

    // Middleware already guards cockpit routes — this is a safety net for direct access
    if (!userId || !tenantId) {
        redirect('/login');
    }

    let hasActivePlan = false;

    try {
        const db = await getDb();
        const results = await db.select({
            plan: tenants.plan
        }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);

        if (results.length > 0) {
            const { plan } = results[0];
            hasActivePlan = plan === 'ENTERPRISE' || plan === 'PRO' || plan === 'STARTER';
        }
    } catch {
        // DB unreachable — default hasActivePlan=false (fail-closed for plan, not for auth)
    }

    return (
        <SessionProvider value={{ userId, tenantId, role, hasActivePlan }}>
            <div className="cockpit-theme min-h-screen bg-[hsl(var(--cockpit-bg))] text-[hsl(var(--cockpit-text))]">
                <div className="mx-auto max-w-[1440px] px-3 pb-8 pt-3 sm:px-4">
                    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
                        <Sidebar />

                        <div className="min-w-0 space-y-4">
                            <CommandBar />

                            <main className="min-w-0">
                                <div className="mx-auto max-w-6xl">{children}</div>
                            </main>
                        </div>
                    </div>
                </div>
            </div>
        </SessionProvider>
    );
}
