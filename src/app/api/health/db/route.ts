import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db/client';
import { sql } from 'drizzle-orm';

export async function GET() {
    try {
        const result = await db.execute(sql`SELECT 1`);
        if (result) {
            return NextResponse.json({ ok: true });
        }
        throw new Error('No result from DB');
    } catch (error: any) {
        console.error('DB Healthcheck failed:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
