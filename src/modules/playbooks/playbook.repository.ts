import { db } from '@/db/client';
import { playbooks, playbookSteps } from '@/drizzle/schema';
import { eq, and, inArray, desc, isNull, sql } from 'drizzle-orm';
import { CreatePlaybookDTO, PlaybookWithSteps } from './playbook.types';
import { randomUUID } from 'node:crypto';

export class PlaybookRepository {
    async create(data: CreatePlaybookDTO, tx: any = db) {
        const playbookId = randomUUID();

        await tx.insert(playbooks).values({
            id: playbookId,
            tenantId: data.tenantId,
            title: data.title,
            description: data.description,
            triggerType: data.triggerType,
            sourceTaskType: data.sourceTaskType,
            createdBy: data.createdBy,
        });

        if (data.steps && data.steps.length > 0) {
            const stepsData = data.steps.map((step, index) => ({
                id: randomUUID(),
                playbookId,
                stepOrder: index,
                title: step.title,
                description: step.description,
                actionType: step.actionType,
                actionConfig: step.actionConfig,
            }));

            await tx.insert(playbookSteps).values(stepsData);
        }

        return this.findById(data.tenantId, playbookId, tx);
    }

    async findById(tenantId: string, id: string, tx: any = db): Promise<PlaybookWithSteps | null> {
        const pb = await tx.select()
            .from(playbooks)
            .where(and(eq(playbooks.id, id), eq(playbooks.tenantId, tenantId)))
            .limit(1);

        if (!pb.length) return null;

        const steps = await tx.select()
            .from(playbookSteps)
            .where(eq(playbookSteps.playbookId, id))
            .orderBy(playbookSteps.stepOrder);

        return {
            ...pb[0],
            steps,
        };
    }

    async listByTenant(tenantId: string, tx: any = db): Promise<PlaybookWithSteps[]> {
        const pbs = await tx.select()
            .from(playbooks)
            .where(and(eq(playbooks.tenantId, tenantId), sql`archived_at IS NULL`))
            .orderBy(desc(playbooks.createdAt));

        if (!pbs.length) return [];

        const playbookIds = pbs.map((p: any) => p.id);

        const allSteps = await tx.select()
            .from(playbookSteps)
            .where(inArray(playbookSteps.playbookId, playbookIds))
            .orderBy(playbookSteps.stepOrder);

        return pbs.map((pb: any) => ({
            ...pb,
            steps: allSteps.filter((s: any) => s.playbookId === pb.id),
        }));
    }

    async findByTrigger(tenantId: string, triggerType: string, tx: any = db): Promise<PlaybookWithSteps[]> {
         const pbs = await tx.select()
            .from(playbooks)
            .where(and(
                eq(playbooks.tenantId, tenantId), 
                eq(playbooks.triggerType, triggerType)
            ))
            .orderBy(desc(playbooks.createdAt));

        if (!pbs.length) return [];
        const playbookIds = pbs.map((p: any) => p.id);
        const allSteps = await tx.select()
            .from(playbookSteps)
            .where(inArray(playbookSteps.playbookId, playbookIds))
            .orderBy(playbookSteps.stepOrder);

        return pbs.map((pb: any) => ({
            ...pb,
            steps: allSteps.filter((s: any) => s.playbookId === pb.id),
        }));
    }
}

export const playbookRepository = new PlaybookRepository();
