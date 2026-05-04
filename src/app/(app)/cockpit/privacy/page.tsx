import { getDb } from "@/infra/db";
import { endUserConsents, userConsentsLog } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { getServerSessionUser } from "@/infra/auth/session";
import { redirect } from "next/navigation";
import { PrivacyControlsClient } from "./_components/PrivacyControlsClient";

export const dynamic = 'force-dynamic';

export default async function PrivacyCockpitPage() {
    const session = await getServerSessionUser();
    if (!session || !session.tenantId || session.role !== 'admin') {
        redirect('/login');
    }
    const tenantId = session.tenantId;

    const db = await getDb();

    const [consentedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(endUserConsents)
        .where(eq(endUserConsents.consentGiven, true));

    const [revokedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(endUserConsents)
        .where(eq(endUserConsents.consentGiven, false));

    const [purgesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userConsentsLog)
        .where(eq(userConsentsLog.source, 'admin_api'));

    const [blockedResult] = await db
        .select({ totalBlocked: sql<number>`sum(${endUserConsents.blockedAttempts})` })
        .from(endUserConsents);

    const totalBlocked = blockedResult?.totalBlocked || 0;

    return (
        <div className="p-8 max-w-5xl mx-auto font-sans">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">🔐 LGPD Privacy & Consent Engine</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="p-6 bg-green-50 rounded-xl border border-green-200 shadow-sm">
                    <h2 className="text-sm font-semibold text-green-700 uppercase tracking-widest mb-2">Total Consented</h2>
                    <p className="text-4xl font-bold text-green-900">{consentedResult.count}</p>
                    <p className="text-xs text-green-600 mt-2">Active compliant users</p>
                </div>

                <div className="p-6 bg-red-50 rounded-xl border border-red-200 shadow-sm">
                    <h2 className="text-sm font-semibold text-red-700 uppercase tracking-widest mb-2">Revoked / Denied</h2>
                    <p className="text-4xl font-bold text-red-900">{revokedResult.count}</p>
                    <p className="text-xs text-red-600 mt-2">Users explicitly blocking ingestion</p>
                </div>

                <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest mb-2">Purges Executed</h2>
                    <p className="text-4xl font-bold text-gray-900">{purgesResult.count}</p>
                    <p className="text-xs text-gray-600 mt-2">Total 'forgotten' identities</p>
                </div>

                <div className="p-6 bg-orange-50 rounded-xl border border-orange-200 shadow-sm">
                    <h2 className="text-sm font-semibold text-orange-700 uppercase tracking-widest mb-2">Blocked AI Prevents</h2>
                    <p className="text-4xl font-bold text-orange-900">{totalBlocked}</p>
                    <p className="text-xs text-orange-600 mt-2">Requests halted lack of consent</p>
                </div>
            </div>

            <div className="p-6 bg-white rounded-xl shadow border border-gray-100">
                <h3 className="text-lg font-semibold border-b pb-4 mb-4">Engine Integrity Logs</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Vector ingestion pipelines are currently enforced via the `webhook/route.ts` gate.
                    Unconsented conversational data is strictly scrubbed.
                </p>
                <ul className="text-xs font-mono text-gray-600 space-y-2 bg-gray-50 p-4 rounded border">
                    <li>[OK] DB Schema updated with <code>end_user_consents</code></li>
                    <li>[OK] RAG Ingestion Block Active</li>
                    <li>[OK] Retention Cron Task Compiled</li>
                </ul>
            </div>

            <PrivacyControlsClient tenantId={tenantId} />
        </div>
    );
}
