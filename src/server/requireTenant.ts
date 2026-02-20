import { NextRequest } from "next/server";

export function requireTenant(request: NextRequest): string {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) throw new Error("Missing x-tenant-id");
  return tenantId;
}
