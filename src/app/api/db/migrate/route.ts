import { NextResponse, NextRequest } from "next/server";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const token = request.headers.get('x-seed-token') || url.searchParams.get('token');

        if (!token || token !== process.env.SEED_TOKEN) {
            return NextResponse.json({ success: false, error: 'Unauthorized: missing or invalid seed token' }, { status: 401 });
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return NextResponse.json({ success: false, error: 'DATABASE_URL is missing' }, { status: 500 });
        }
        if (!dbUrl.includes('/lojacond')) {
            return NextResponse.json({ success: false, error: 'DATABASE_URL missing database name (/lojacond)' }, { status: 500 });
        }

        const urlObj = new URL(dbUrl);
        console.log(`Connecting to DB for migration: Host=${urlObj.hostname}, Database=${urlObj.pathname.replace('/', '')}`);

        const connection = await mysql.createConnection({
            uri: dbUrl,
            multipleStatements: true,
            ssl: { rejectUnauthorized: true }
        });

        const db = drizzle(connection);

        console.log('Running Drizzle migrations...');
        const migrationsFolder = path.join(process.cwd(), 'drizzle');

        await migrate(db, { migrationsFolder });

        await connection.end();

        return NextResponse.json({ success: true, message: 'Migrations applied successfully' });
    } catch (err: any) {
        console.error("[/api/db/migrate] error", err);
        return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    // Allow GET as well for easy triggering via browser if needed
    return POST(request);
}
