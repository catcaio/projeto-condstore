import { NextRequest, NextResponse } from "next/server";
import { rateLimitCheck } from "@/server/rate-limit.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json(
      { error: "Missing tenant id" },
      { status: 400 }
    );
  }

  const result = await rateLimitCheck({
    tenantId,
    bucket: "api",
    maxRequests: 60,
    windowSeconds: 60
  });

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMIT" },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((result.resetAt - Date.now()) / 1000)
          )
        }
      }
    );
  }

  return NextResponse.json({ ok: true });
}
