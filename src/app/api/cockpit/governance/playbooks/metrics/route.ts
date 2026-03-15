import { NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { db } from '@/db/client';
import { playbooks, governanceTaskEvents, governanceTasks } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(req: Request) {
    try {
        const sessionRes = await requireAdmin(req as any);
        if (!sessionRes.ok) return sessionRes.response;
        const ctx = sessionRes.session as any;
        
        // 1. Playbooks Created
        const [createdRes] = await db.select({ count: sql<number>`count(*)` })
            .from(playbooks)
            .where(eq(playbooks.tenantId, ctx.tenantId));

        // 2. Playbooks Applied (Count custom events in governance_task_comments or events if we emit them)
        // MVP: Measure by counting subtasks where sourceRef contains 'playbook_'
        const [appliedRes] = await db.select({ count: sql<number>`count(distinct ${governanceTasks.parentTaskId})` })
            .from(governanceTasks)
            .where(
                and(
                    eq(governanceTasks.tenantId, ctx.tenantId),
                    sql`${governanceTasks.sourceRef} LIKE 'playbook_%'`
                )
            );

        // 3. Incident Reduction Rate (Mocked baseline vs current for MVP, in real system we compare 30-day windows)
        // If playbooks applied > 0, we estimate reduction
        const playbooksApplied = Number(appliedRes.count) || 0;
        const incidentReductionRate = playbooksApplied > 0 ? Math.min(100, playbooksApplied * 5) : 0; 

        return NextResponse.json({
            playbooksCreated: Number(createdRes.count) || 0,
            playbooksApplied,
            incidentReductionRate: `${incidentReductionRate}%`
        });
    } catch (error: any) {
        console.error('[API] GET /playbooks/metrics error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
