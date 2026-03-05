import { getDb } from '../db';
import { eq, desc, and } from 'drizzle-orm';
import { projectReports, type NewProjectReportRecord, type ProjectReportRecord } from '../../drizzle/schema';
import { logger } from '../logger';

export class ProjectReportRepository {
    async saveReport(record: NewProjectReportRecord): Promise<void> {
        try {
            const db = await getDb();
            await db.insert(projectReports).values(record);
            logger.info('Project report persisted', {
                id: record.id,
                moduleKey: record.moduleKey,
                title: record.title,
            });
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
                logger.debug('Report already persisted (hash collision), skipping', {
                    moduleKey: record.moduleKey,
                    contentHash: record.contentHash,
                });
                return;
            }
            logger.error('Failed to persist project report', error as Error, {
                moduleKey: record.moduleKey,
            });
            throw error;
        }
    }

    async getAllReports(): Promise<ProjectReportRecord[]> {
        const db = await getDb();
        return db.select().from(projectReports).orderBy(desc(projectReports.createdAt));
    }

    async getReportById(id: string): Promise<ProjectReportRecord | undefined> {
        const db = await getDb();
        const results = await db.select().from(projectReports).where(eq(projectReports.id, id));
        return results[0];
    }

    async getReportsByModule(moduleKey: string): Promise<ProjectReportRecord[]> {
        const db = await getDb();
        return db.select().from(projectReports).where(eq(projectReports.moduleKey, moduleKey)).orderBy(desc(projectReports.createdAt));
    }
}

export const projectReportRepository = new ProjectReportRepository();
