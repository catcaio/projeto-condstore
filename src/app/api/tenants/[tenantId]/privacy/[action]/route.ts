import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';
import { getDb } from '@/infra/db';
import { messages, customerAccounts } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string, action: string }> }) {
    const requestId = makeRequestId(req);
    const resolvedParams = await params;
    const { tenantId, action } = resolvedParams;

    const guard = await requireSessionTenantMatch(req, tenantId);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    try {
        const body = await req.json();
        const { phoneHash, organizationId } = body;

        if (!phoneHash && !organizationId) {
            return NextResponse.json({ error: 'Phone hash or organizationId is required' }, { status: 400 });
        }

        switch (action) {
            case 'revoke':
                if (phoneHash) {
                    await endUserConsentRepository.revokeConsent(tenantId, phoneHash, 'admin_api', 'Admin forced revocation');
                }

                if (organizationId) {
                    const db = await getDb();
                    await db.update(customerAccounts)
                        .set({ status: 'revoked' })
                        .where(and(eq(customerAccounts.tenantId, tenantId), eq(customerAccounts.organizationId, organizationId)));
                }

                return NextResponse.json({ success: true, message: 'Consent/Access revoked' });

            case 'purge':
                const db = await getDb();

                if (phoneHash) {
                    // 1. Revoke first to block future ingestion
                    await endUserConsentRepository.revokeConsent(tenantId, phoneHash, 'admin_api', 'Admin hard purge');

                    // 2. Erase from SQL / Conversational History
                    await db.delete(messages).where(and(eq(messages.tenantId, tenantId), eq(messages.phoneHash, phoneHash)));
                }

                if (organizationId) {
                    await db.update(customerAccounts)
                        .set({ status: 'revoked' })
                        .where(and(eq(customerAccounts.tenantId, tenantId), eq(customerAccounts.organizationId, organizationId)));
                }

                return NextResponse.json({ success: true, message: 'Identity purged from knowledge base' });

            case 'export':
                if (!phoneHash) {
                    return NextResponse.json({ error: 'Export requires phoneHash currently' }, { status: 400 });
                }

                // For exporting, we'll pull the consent record as a baseline, and returning as a downloadable structure
                const consent = await endUserConsentRepository.getConsent(tenantId, phoneHash);
                if (!consent) {
                    return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
                }

                return new NextResponse(JSON.stringify({
                    tenantId,
                    identity: phoneHash,
                    consentStatus: consent.consentGiven ? 'Active' : 'Revoked/Denied',
                    historyTimestamp: consent.consentTimestamp,
                    blockedInferences: consent.blockedAttempts,
                    exportedAt: new Date().toISOString()
                }, null, 2), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Disposition': `attachment; filename="privacy_export_${phoneHash}.json"`
                    }
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
    }
}
