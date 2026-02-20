import { NextRequest, NextResponse } from "next/server";
import { rateLimitCheck } from "@/server/rate-limit.service";

export const config = {
  matcher: [
    "/api/:path*",
  ],
};

export async function middleware(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json(
      { error: "Missing tenant id" },
      { status: 400 }
    );
  }

  const result = await rateLimitCheck({
    tenantId,
    bucket: "global",
    maxRequests: 120,
    windowSeconds: 60,
  });

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMIT" },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((result.resetAt - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  return NextResponse.next();
}
