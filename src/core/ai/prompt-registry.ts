import { eq, and } from 'drizzle-orm';
import { getDb } from '../../infra/db';
import { aiPrompts } from '../../drizzle/schema';
import { logger } from '../../infra/logger';

export type PromptDefinition = {
    id: string;
    version: string;
    system: string;
    temperature: number;
    maxTokens: number;
    createdAt?: Date;
    active: boolean;
};

export class PromptRegistry {
    async getActivePrompt(id: string): Promise<PromptDefinition | null> {
        try {
            const db = await getDb();
            const results = await db
                .select()
                .from(aiPrompts)
                .where(and(eq(aiPrompts.id, id), eq(aiPrompts.active, 1)))
                ;

            if (results.length === 0) return null;

            const row = results[0];
            return {
                id: row.id,
                version: row.version,
                system: row.system,
                temperature: Number(row.temperature),
                maxTokens: row.maxTokens,
                createdAt: row.createdAt,
                active: row.active === 1
            };
        } catch (error) {
            logger.error('failed_to_get_active_prompt', error as Error, { id });
            return null;
        }
    }

    async listPromptVersions(id: string): Promise<PromptDefinition[]> {
        const db = await getDb();
        const results = await db.select().from(aiPrompts).where(eq(aiPrompts.id, id));
        return results.map(row => ({
            id: row.id,
            version: row.version,
            system: row.system,
            temperature: Number(row.temperature),
            maxTokens: row.maxTokens,
            createdAt: row.createdAt,
            active: row.active === 1
        }));
    }

    async setActivePrompt(id: string, version: string): Promise<void> {
        const db = await getDb();
        await db.transaction(async (tx) => {
            await tx.update(aiPrompts).set({ active: 0 }).where(eq(aiPrompts.id, id));
            await tx.update(aiPrompts).set({ active: 1 }).where(and(eq(aiPrompts.id, id), eq(aiPrompts.version, version)));
        });
        logger.info('prompt_version_activated', { id, version });
    }

    async registerPrompt(definition: Omit<PromptDefinition, 'createdAt'>): Promise<void> {
        const db = await getDb();

        // If it's the first active, ensure uniquely active or if user explicitly requested active
        if (definition.active) {
            await db.update(aiPrompts).set({ active: 0 }).where(eq(aiPrompts.id, definition.id));
        }

        await db.insert(aiPrompts).values({
            id: definition.id,
            version: definition.version,
            system: definition.system,
            temperature: definition.temperature.toString(),
            maxTokens: definition.maxTokens,
            active: definition.active ? 1 : 0
        });

        logger.info('prompt_version_registered', { id: definition.id, version: definition.version });
    }
}

export const promptRegistry = new PromptRegistry();
