/**
 * GET /api/internal/health/webhook
 *
 * Deep health check for all subsystems the webhook depends on.
 * Returns 200 if all components are healthy, 503 if any are degraded.
 *
 * Response shape:
 * {
 *   "signature": "ok" | "error",   — TWILIO_AUTH_TOKEN is configured
 *   "rateLimit": "ok" | "error",   — Redis responds to rate limit ping
 *   "db": "ok" | "error",          — MySQL responds to SELECT 1
 *   "redis": "ok" | "error",       — Redis responds to PING
 *   "circuitBreaker": "closed" | "open",
 *   "healthy": true | false
 * }
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb } from "../../../../../infra/db";
import { redisClient } from "../../../../../infra/redis.client";
import { getCircuitBreakerStatus } from "../../../../../infra/circuit-breaker";
import { logger } from "../../../../../infra/logger";

type ComponentStatus = "ok" | "error";

async function checkSignature(): Promise<ComponentStatus> {
    return process.env.TWILIO_AUTH_TOKEN ? "ok" : "error";
}

async function checkRedis(): Promise<ComponentStatus> {
    try {
        const alive = await redisClient.ping();
        return alive ? "ok" : "error";
    } catch {
        return "error";
    }
}

async function checkDb(): Promise<ComponentStatus> {
    try {
        const db = await getDb();
        // Lightweight ping — no table scan
        await db.execute("SELECT 1" as any);
        return "ok";
    } catch (err) {
        logger.warn("Health check: DB ping failed", {
            event: "health_check_db_error",
            error: (err as Error).message,
        });
        return "error";
    }
}

export async function GET() {
    const [signature, rateLimit, db, redis] = await Promise.all([
        checkSignature(),
        checkRedis(), // rateLimit health = redis connectivity
        checkDb(),
        checkRedis(),
    ]);

    const circuit = getCircuitBreakerStatus();
    const healthy =
        signature === "ok" &&
        rateLimit === "ok" &&
        db === "ok" &&
        redis === "ok" &&
        circuit.state === "closed";

    const body = {
        signature,
        rateLimit,
        db,
        redis,
        circuitBreaker: circuit.state,
        healthy,
        timestamp: new Date().toISOString(),
    };

    return NextResponse.json(body, { status: healthy ? 200 : 503 });
}
