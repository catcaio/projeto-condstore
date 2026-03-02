import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { getAuthContext } from '@/infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';
import { getDb } from '@/infra/db';
import { messages } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function _POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string, action: string }> }) {
    const requestId = makeRequestId(req);
    const resolvedParams = await params;
    const { tenantId, action } = resolvedParams;

    const guard = await getAuthContext(req, tenantId);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    try {
        const body = await req.json();
        const { phoneHash } = body;

        if (!phoneHash) {
            return NextResponse.json({ error: 'Phone hash is required' }, { status: 400 });
        }

        switch (action) {
            case 'revoke':
                await endUserConsentRepository.revokeConsent(tenantId, phoneHash, 'admin_api', 'Admin forced revocation');
                return NextResponse.json({ success: true, message: 'Consent revoked' });

            case 'purge':
                // 1. Revoke first to block future ingestion
                await endUserConsentRepository.revokeConsent(tenantId, phoneHash, 'admin_api', 'Admin hard purge');

                // 2. Erase from SQL / Conversational History
                const db = await getDb();
                await db.delete(messages).where(and(eq(messages.tenantId, tenantId), eq(messages.phoneHash, phoneHash)));

                return NextResponse.json({ success: true, message: 'Identity purged from knowledge base' });

            case 'export':
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

export const POST = withGlobalErrorInterceptor(_POST);
