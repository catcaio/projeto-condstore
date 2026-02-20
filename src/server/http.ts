import { NextRequest, NextResponse } from "next/server";

export function tenantOr401(request: NextRequest): { tenantId: string } | NextResponse {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: missing x-tenant-id" },
      { status: 401 }
    );
  }
  return { tenantId };
}

export function seedTokenOr401(request: NextRequest): { token: string } | NextResponse {
  const token = request.headers.get("x-seed-token");
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: missing x-seed-token" },
      { status: 401 }
    );
  }
  return { token };
}
