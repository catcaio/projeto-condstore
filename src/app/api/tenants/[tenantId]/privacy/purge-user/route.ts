import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/infra/db";
import { messages, freightFunnelEvents } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { endUserConsentRepository } from "@/infra/repositories/end-user-consent.repository";
import { errorResponse, ErrorCode } from "@/infra/http/error-response";
import { makeRequestId } from "@/infra/http/request-trace";
import { structuredLogger } from "@/infra/log/logger";
import { vectorPurgeService } from "@/modules/privacy/vector-purge.service";

import { getAuthContext } from "@/infra/auth/tenant-route-guard";

async function _DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    const requestId = makeRequestId(request);
    const { tenantId } = await params;

    // Auth + Tenant Boundary check
    const auth = await getAuthContext(request, tenantId);
    if (!auth.ok) return auth.response;

    try {
        const body = await request.json();
        const { phoneHash, source = 'admin_api' } = body;

        if (!phoneHash) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, "Missing phoneHash in payload.");
        }

        const db = await getDb();

        let deletedMessages = 0;
        let deletedFunnel = 0;

        await db.transaction(async (tx) => {
            // Revoke Consent (creates an audit log + removes consent tracking)
            const ip = request.headers.get("x-forwarded-for") || "unknown";
            await endUserConsentRepository.revokeConsent(tenantId, phoneHash, source, ip);

            // Wipe Conversations
            const [msgResult] = await tx
                .delete(messages)
                .where(and(eq(messages.tenantId, tenantId), eq(messages.phoneHash, phoneHash)));
            deletedMessages = msgResult.affectedRows || 0;

            // Wipe Funnel Events
            const [funnelResult] = await tx
                .delete(freightFunnelEvents)
                .where(and(eq(freightFunnelEvents.tenantId, tenantId), eq(freightFunnelEvents.phoneHash, phoneHash)));
            deletedFunnel = funnelResult.affectedRows || 0;

            // Purge Vector Embeddings
            await vectorPurgeService.deleteEmbeddingsByUser(tenantId, phoneHash);

            // NOTE: In the future, if specific unstructured vector chunks matching this user identity 
            // exist in `tenant_document_chunks` for RAG memory arrays, they must be purged here as well.
        });

        structuredLogger.info("lgpd_user_purged", {
            requestId,
            tenantId,
            phoneHash,
            deletedMessages,
            deletedFunnel,
            source,
        });

        return NextResponse.json({
            status: "ok",
            message: "User permanently forgotten",
            deletedRows: {
                messages: deletedMessages,
                funnelEvents: deletedFunnel
            }
        });
    } catch (err) {
        structuredLogger.error("lgpd_purge_failed", { requestId, tenantId, error: err });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, "Failed to purge user data.");
    }
}

export const DELETE = withGlobalErrorInterceptor(_DELETE);
