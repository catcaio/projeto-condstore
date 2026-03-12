import { getDb } from '@/infra/db';
import { tenantPlaybooks } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CreatePlaybookDTO, UpdatePlaybookDTO, PlaybookDefinition, PlaybookEntity, PlaybookStep } from './playbooks.types';

export class PlaybooksRepository {
    async create(tenantId: string, data: CreatePlaybookDTO, operatorId?: string): Promise<PlaybookDefinition> {
        const db = await getDb();
        const id = crypto.randomUUID();

        await db.insert(tenantPlaybooks).values({
            id,
            tenantId,
            name: data.name,
            description: data.description || null,
            entity: data.entity,
            isActive: data.isActive,
            steps: data.steps,
            createdBy: operatorId || null
        });

        const rec = await this.findById(tenantId, id);
        if (!rec) throw new Error('Failed to create playbook');
        return rec;
    }

    async findById(tenantId: string, id: string): Promise<PlaybookDefinition | null> {
        const db = await getDb();
        const records = await db.select().from(tenantPlaybooks).where(and(eq(tenantPlaybooks.tenantId, tenantId), eq(tenantPlaybooks.id, id))).limit(1);
        if (!records.length) return null;
        const r = records[0];
        return {
            ...r,
            entity: r.entity as PlaybookEntity,
            steps: (typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps) as PlaybookStep[]
        };
    }

    async listByTenant(tenantId: string, entity?: PlaybookEntity): Promise<PlaybookDefinition[]> {
        const db = await getDb();
        const records = await db.select().from(tenantPlaybooks).where(eq(tenantPlaybooks.tenantId, tenantId)).orderBy(desc(tenantPlaybooks.createdAt));
        
        return records.map((r: any) => ({
            ...r,
            entity: r.entity as PlaybookEntity,
            steps: (typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps) as PlaybookStep[]
        })).filter((r: any) => !entity || r.entity === entity);
    }

    async update(tenantId: string, id: string, data: UpdatePlaybookDTO, currentVersion: number): Promise<PlaybookDefinition | null> {
        const db = await getDb();
        const updateData: any = { version: currentVersion + 1 };
        
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.steps !== undefined) updateData.steps = data.steps;

        await db.update(tenantPlaybooks)
            .set(updateData)
            .where(and(eq(tenantPlaybooks.tenantId, tenantId), eq(tenantPlaybooks.id, id)));

        return this.findById(tenantId, id);
    }

    async delete(tenantId: string, id: string): Promise<void> {
        const db = await getDb();
        await db.delete(tenantPlaybooks).where(and(eq(tenantPlaybooks.tenantId, tenantId), eq(tenantPlaybooks.id, id)));
    }
}

export const playbooksRepository = new PlaybooksRepository();
