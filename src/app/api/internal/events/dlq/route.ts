import { NextRequest, NextResponse } from "next/server";
import { redisClient } from "../../../../../infra/redis.client";
import { z } from "zod";

import { requireInternalToken } from '@/infra/auth/tenant-route-guard';

const querySchema = z.object({
    stream: z.string().default("events:finops"),
});

export async function GET(req: NextRequest) {
    const internalGuard = requireInternalToken(req);
    if (!internalGuard.ok) return internalGuard.response;

    const { searchParams } = new URL(req.url);
    const result = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!result.success) {
        return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { stream } = result.data;
    const dlqStream = `${stream}:dlq`;

    const redis = redisClient.getRawClient();
    if (!redisClient.isAvailable() || !redis) {
        return NextResponse.json({ error: "Redis not available" }, { status: 503 });
    }

    try {
        const rawEvents = await redis.xrevrange(dlqStream, "+", "-", "COUNT", 50);

        const events = rawEvents.map(([rawId, fields]) => {
            const payloadIndex = fields.indexOf("payload");
            if (payloadIndex === -1) return null;

            try {
                const payload = JSON.parse(fields[payloadIndex + 1]);
                return {
                    rawId,
                    id: payload.id,
                    type: payload.type,
                    tenantId: payload.tenantId,
                    reason: payload.dlqReason || "Unknown",
                    createdAt: payload.createdAt,
                    dlqAt: payload.dlqAt,
                };
            } catch {
                return { rawId, error: "parsing_failed" };
            }
        }).filter(Boolean);

        return NextResponse.json({ success: true, count: events.length, events });
    } catch (error) {
        return NextResponse.json({ error: "Failed to read DLQ" }, { status: 500 });
    }
}
