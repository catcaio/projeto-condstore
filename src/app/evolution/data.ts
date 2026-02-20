import { getDb } from '@/infra/db';
import { sql } from 'drizzle-orm';
import { GitHubCommit, ProjectReport } from './types';

export const dynamic = 'force-dynamic';

export async function getReports(): Promise<{ data: ProjectReport[], error: string | null }> {
    try {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl || (!dbUrl.includes('/lojacond') && !dbUrl.includes('localhost'))) {
            return { data: [], error: 'DB offline (Invalid Connection)' };
        }

        const db = await getDb();
        const res = await db.execute(sql`
            SELECT id, module_key, title, summary, status, changes, metrics, risks, next_actions, tags, source, content_hash, created_at 
            FROM project_reports 
            ORDER BY created_at DESC 
            LIMIT 500
        `);
        const data = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res;

        // Ensure standard date format for client boundary
        const serialized = (data as any[]).map(row => ({
            ...row,
            created_at: new Date(row.created_at).toISOString(),
            changes: row.changes || null,
            metrics: row.metrics || null,
            risks: row.risks || null,
            next_actions: row.next_actions || null,
            tags: row.tags || null,
        }));

        return { data: serialized as ProjectReport[], error: null };
    } catch (err) {
        console.error('Failed to fetch reports:', err);
        return { data: [], error: 'DB offline' };
    }
}

export async function getCommits(): Promise<GitHubCommit[]> {
    try {
        const res = await fetch('https://api.github.com/repos/catcaio/projeto-condstore/commits?per_page=10', {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'Condstore-Evolution-Page',
            },
            next: { revalidate: 60 },
        });

        if (!res.ok) return [];
        return res.json();
    } catch (err) {
        console.error('Failed to fetch commits:', err);
        return [];
    }
}

export async function getBuildInfo() {
    return {
        version: (await import('../../../package.json')).version as string,
        env: (process.env.VERCEL_ENV || 'development') as string,
        serverTime: new Date().toISOString(),
        serverTimestamp: new Date().getTime(),
    }
}
