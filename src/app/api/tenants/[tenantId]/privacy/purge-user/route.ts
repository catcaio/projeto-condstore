import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/infra/db";
import {
    messages, freightFunnelEvents,
    organizations, sites, customerAccounts, customerTimelineEvents, deliveryProofs, invoices
} from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { endUserConsentRepository } from "@/infra/repositories/end-user-consent.repository";
import { errorResponse, ErrorCode } from "@/infra/http/error-response";
import { makeRequestId } from "@/infra/http/request-trace";
import { structuredLogger } from "@/infra/log/logger";
import { vectorPurgeService } from "@/modules/privacy/vector-purge.service";
import { requireAdminSession } from "@/infra/auth/tenant-route-guard";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    const requestId = makeRequestId(request);
    const { tenantId } = await params;

    // P0 SECURITY: Auth guard — admin + tenant match required for destructive purge
    const authResult = await requireAdminSession(request);
    if (!authResult.ok) {
        structuredLogger.warn("lgpd_purge_unauthorized", { requestId, tenantId, reason: "no_session_or_not_admin" });
        return authResult.response;
    }
    if (authResult.tenantId !== tenantId) {
        structuredLogger.warn("lgpd_purge_tenant_mismatch", { requestId, tenantId, sessionTenant: authResult.tenantId });
        return NextResponse.json({ error: "FORBIDDEN", message: "Tenant mismatch" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { phoneHash, organizationId, source = 'admin_api' } = body;

        if (!phoneHash && !organizationId) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, "Missing phoneHash or organizationId in payload.");
        }

        const db = await getDb();

        let deletedMessages = 0;
        let deletedFunnel = 0;

        await db.transaction(async (tx) => {
            if (phoneHash) {
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
            }

            if (organizationId) {
                // Wipe physical financial + fulfillment links
                await tx.delete(deliveryProofs).where(and(eq(deliveryProofs.tenantId, tenantId), eq(deliveryProofs.organizationId, organizationId)));
                await tx.delete(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.organizationId, organizationId)));

                // Anonymize Public Timelines without breaking referential integrity downstream
                await tx.update(customerTimelineEvents)
                    .set({ messagePublic: '[REDACTED]', metadataJson: null })
                    .where(and(eq(customerTimelineEvents.tenantId, tenantId), eq(customerTimelineEvents.organizationId, organizationId)));

                // Wipe core structures mapping
                await tx.delete(customerAccounts).where(and(eq(customerAccounts.tenantId, tenantId), eq(customerAccounts.organizationId, organizationId)));
                await tx.delete(sites).where(and(eq(sites.tenantId, tenantId), eq(sites.organizationId, organizationId)));
                await tx.delete(organizations).where(and(eq(organizations.tenantId, tenantId), eq(organizations.id, organizationId)));
            }

            // NOTE: In the future, if specific unstructured vector chunks matching this user identity 
            // exist in `tenant_document_chunks` for RAG memory arrays, they must be purged here as well.
        });

        structuredLogger.info("lgpd_user_purged", {
            requestId,
            tenantId,
            phoneHash: phoneHash || 'none',
            organizationId: organizationId || 'none',
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
