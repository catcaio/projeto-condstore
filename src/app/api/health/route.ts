import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}

export async function POST() { return new NextResponse(null, { status: 405 }); }
export async function PUT() { return new NextResponse(null, { status: 405 }); }
export async function PATCH() { return new NextResponse(null, { status: 405 }); }
export async function DELETE() { return new NextResponse(null, { status: 405 }); }
