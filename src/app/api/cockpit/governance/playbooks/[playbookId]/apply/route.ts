import { NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { playbookService } from '@/modules/playbooks/playbook.service';
import { ApplyPlaybookSchema } from '@/modules/playbooks/playbook.schemas';

export async function POST(req: Request, context: any) {
    try {
        const sessionRes = await requireAdmin(req as any);
        if (!sessionRes.ok) return sessionRes.response;
        const ctx = sessionRes.session as any;
        const body = await req.json();

        const parsed = ApplyPlaybookSchema.safeParse({
            playbookId: (await context.params).playbookId,
            parentTaskId: body.parentTaskId
        });

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
        }

        const result = await playbookService.applyPlaybook({
            tenantId: ctx.tenantId,
            playbookId: parsed.data.playbookId,
            parentTaskId: parsed.data.parentTaskId,
            actorUserId: ctx.userId
        });

        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        console.error('[API] POST /playbooks/:id/apply error:', error);
        if (error.message.includes('not found')) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
