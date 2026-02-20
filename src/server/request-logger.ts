import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function withRequestLogging(
  request: NextRequest,
  handler: () => Promise<NextResponse>
) {
  const start = Date.now();
  const correlationId = request.headers.get("x-correlation-id") ?? randomUUID();
  const tenantId = request.headers.get("x-tenant-id") ?? null;

  try {
    const response = await handler();
    const durationMs = Date.now() - start;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "INFO",
      message: "request_completed",
      correlationId,
      tenantId,
      path: request.nextUrl.pathname,
      status: response.status,
      durationMs
    }));

    response.headers.set("x-correlation-id", correlationId);
    return response;
  } catch (error: any) {
    const durationMs = Date.now() - start;

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message: "request_failed",
      correlationId,
      tenantId,
      path: request.nextUrl.pathname,
      durationMs,
      error: error?.message
    }));

    throw error;
  }
}
