import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/infra/db"; // Use the existing db connection logic
import { sql } from "drizzle-orm";

export async function POST() {
    try {
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
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) });
    }
}
