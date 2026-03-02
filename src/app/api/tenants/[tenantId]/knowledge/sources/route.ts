import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { tenantKnowledgeSources } from '@/drizzle/schema';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { makeRequestId } from '@/infra/http/request-trace';

async function _GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string  }> }) {
    const requestId = makeRequestId(req);
    const auth = await requireAdmin(req, { requestId });
    if (!auth.ok) return auth.response;

    if (auth.session.tenantId !== (await params).tenantId) {
        return NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 });
    }

    try {
        const db = await getDb();
        const sources = await db.select()
            .from(tenantKnowledgeSources)
            .where(eq(tenantKnowledgeSources.tenantId, (await params).tenantId));

        return NextResponse.json({ sources });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch knowledge sources' }, { status: 500 });
    }
}

async function _POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string  }> }) {
    const requestId = makeRequestId(req);
    const auth = await requireAdmin(req, { requestId });
    if (!auth.ok) return auth.response;

    if (auth.session.tenantId !== (await params).tenantId) {
        return NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { type, name } = body;

        if (!type || !name) {
            return NextResponse.json({ error: 'Type and name are required' }, { status: 400 });
        }

        const db = await getDb();
        const id = crypto.randomUUID();

        await db.insert(tenantKnowledgeSources).values({
            id,
            tenantId: (await params).tenantId,
            type,
            name,
            status: 'draft',
            createdAt: new Date(),
        });

        return NextResponse.json({ ok: true, id });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to create knowledge source' }, { status: 500 });
    }
}

export const GET = withGlobalErrorInterceptor(_GET);

export const POST = withGlobalErrorInterceptor(_POST);
