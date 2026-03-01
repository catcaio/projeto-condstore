import { NextResponse, NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/infra/db"; // Use the existing db connection logic
import { sql } from "drizzle-orm";
import { logger } from '@/infra/logger';
import { makeRequestId } from '@/infra/http/request-trace';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (process.env.IS_DEV !== 'true') {
    return NextResponse.json({ success: false, error: 'Forbidden in production' }, { status: 403 });
  }

  try {
    const token = request.headers.get('x-seed-token');

    if (!token || token !== process.env.SEED_TOKEN) {
      return NextResponse.json({ success: false, error: 'Unauthorized: missing or invalid seed token' }, { status: 401 });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ success: false, error: 'DATABASE_URL missing' }, { status: 500 });
    }
    if (!dbUrl.includes('/lojacond')) {
      return NextResponse.json({ success: false, error: 'DATABASE_URL missing database name' }, { status: 500 });
    }

    const urlObj = new URL(dbUrl);
    console.log(`Connecting to DB: Host=${urlObj.hostname}, Database=${urlObj.pathname.replace('/', '')}`);

    const db = await getDb();
    const id = randomUUID();
    const hash = randomUUID().replace(/-/g, '');

    await db.execute(sql`
      INSERT INTO project_reports (
        id, module_key, title, summary, content_hash
      )
      VALUES (
        ${id},
        'core',
        'Evolution Initialized',
        'Primeiro relatório automático criado para ativar /evolution.',
        ${hash}
      )
    `);

    return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: true, success: true });
  } catch (err: any) {
    const requestId = makeRequestId(request);
    logger.error('[/api/reports/seed] error', err as Error, { requestId });
    return NextResponse.json({ ok: false, success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
