import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/infra/db";
import {
    messages, freightFunnelEvents, endUserConsents, userConsentsLog
} from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { errorResponse, ErrorCode } from "@/infra/http/error-response";
import { makeRequestId } from "@/infra/http/request-trace";
import { structuredLogger } from "@/infra/log/logger";
import { requireAdminSession } from "@/infra/auth/tenant-route-guard";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    const requestId = makeRequestId(request);
    const { tenantId } = await params;

    const authResult = await requireAdminSession(request);
    if (!authResult.ok) {
        structuredLogger.warn("lgpd_export_unauthorized", { requestId, tenantId, reason: "no_session_or_not_admin" });
        return authResult.response;
    }
    if (authResult.tenantId !== tenantId) {
        structuredLogger.warn("lgpd_export_tenant_mismatch", { requestId, tenantId, sessionTenant: authResult.tenantId });
        return NextResponse.json({ error: "FORBIDDEN", message: "Tenant mismatch" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { phoneHash } = body;

        if (!phoneHash) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, "Missing phoneHash in payload.");
        }

        const db = await getDb();

        const userMessages = await db.select().from(messages).where(and(eq(messages.tenantId, tenantId), eq(messages.phoneHash, phoneHash)));
        const userFunnel = await db.select().from(freightFunnelEvents).where(and(eq(freightFunnelEvents.tenantId, tenantId), eq(freightFunnelEvents.phoneHash, phoneHash)));
        const consent = await db.select().from(endUserConsents).where(and(eq(endUserConsents.tenantId, tenantId), eq(endUserConsents.phoneHash, phoneHash))).limit(1);
        const consentLogs = await db.select().from(userConsentsLog).where(and(eq(userConsentsLog.tenantId, tenantId), eq(userConsentsLog.phoneHash, phoneHash)));

        structuredLogger.info("lgpd_user_exported", {
            requestId,
            tenantId,
            phoneHash,
            messagesCount: userMessages.length,
            funnelCount: userFunnel.length
        });

        return NextResponse.json({
            status: "ok",
            data: {
                consent: consent[0] || null,
                consentHistory: consentLogs,
                messages: userMessages.map(m => ({
                    id: m.messageSid,
                    date: m.createdAt,
                    direction: m.direction,
                    intent: m.intent,
                    body: m.body
                })),
                funnelEvents: userFunnel.map(f => ({
                    id: f.id,
                    date: f.createdAt,
                    stage: f.stage,
                    source: f.utmSource
                }))
            }
        });
    } catch (err) {
        structuredLogger.error("lgpd_export_failed", { requestId, tenantId, error: err });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, "Failed to export user data.");
    }
}
