import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { projectReportRepository } from '@/infra/repositories/project-report.repository';
import { getSessionUser } from '@/infra/auth/session';
import { logger } from '@/infra/logger';

/**
 * POST /api/reports/ingest
 * 
 * Ingests a project evolution report.
 * Protected by session auth OR ADMIN_TOKEN env var.
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Authentication
        const adminToken = process.env.ADMIN_TOKEN;
        const authHeader = request.headers.get('Authorization');
        const isTokenAuth = adminToken && authHeader === `Bearer ${adminToken}`;
        
        const sessionUser = await getSessionUser(request);
        const isSessionAuth = !!sessionUser;

        if (!isTokenAuth && !isSessionAuth) {
            logger.warn('Unauthorized report ingestion attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        const body = await request.json();
        const { moduleKey, title, summary, status, changes, metrics, risks, nextActions, tags, source } = body;

        if (!moduleKey || !title || !summary) {
            return NextResponse.json({ error: 'Missing required fields: moduleKey, title, summary' }, { status: 400 });
        }

        // 3. Idempotency Check (Content Hash)
        const contentToHash = `${moduleKey}|${title}|${summary}|${status || 'done'}`;
        const contentHash = createHash('sha256').update(contentToHash).digest('hex');

        // 4. Persist
        const reportId = randomUUID();
        await projectReportRepository.saveReport({
            id: reportId,
            moduleKey,
            title,
            summary,
            status: status || 'done',
            changes: changes ? JSON.stringify(changes) : null,
            metrics: metrics ? JSON.stringify(metrics) : null,
            risks: risks ? JSON.stringify(risks) : null,
            nextActions: nextActions ? JSON.stringify(nextActions) : null,
            tags: tags ? JSON.stringify(tags) : null,
            source: source || 'manual',
            contentHash,
        });

        return NextResponse.json({ 
            success: true, 
            id: reportId,
            message: 'Report ingested successfully' 
        });

    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
            return NextResponse.json({ 
                success: true, 
                message: 'Report already exists (idempotent)' 
            });
        }
        
        logger.error('Report ingestion failed', error as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
