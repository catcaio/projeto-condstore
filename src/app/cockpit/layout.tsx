import Sidebar from './_components/sidebar';
import CommandBar from './_components/command-bar';
import { getServerSessionUser } from '@/infra/auth/session';
import { getDb } from '@/infra/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { EntitlementProvider, Role } from '@/ui/auth/entitlements';
import { redirect } from 'next/navigation';

export default async function CockpitLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSessionUser();

    if (!session) {
        redirect('/login');
    }

    let hasActivePlan = false;
    let role = session.role as Role;

    if (session.tenantId) {
        try {
            const db = await getDb();
            const results = await db.select({
                planStatus: tenants.planStatus,
                plan: tenants.plan
            }).from(tenants).where(eq(tenants.id, session.tenantId)).limit(1);

            if (results.length > 0) {
                const { planStatus, plan } = results[0];
                hasActivePlan = planStatus === 'active' || planStatus === 'trialing' || plan === 'ENTERPRISE';
            }
        } catch (error) {
            console.error('Failed to get tenant plan status', error);
        }
    }
    return (
        <EntitlementProvider value={{ role, hasActivePlan }}>
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
        </EntitlementProvider>
    );
}
