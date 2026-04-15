import { and, asc, eq, like } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { tenantConfigurations } from '@/drizzle/schema';

type RawConfigValue = Record<string, unknown>;

const TUDICO_CATEGORY = 'tudico';

function buildKey(prefix: string, id: string): string {
  return `tudico:${prefix}:${id}`;
}

export class TudicoRepository {
  async listByPrefix<T>(tenantId: string, prefix: string): Promise<T[]> {
    const db = await getDb();
    const rows = await db
      .select({ value: tenantConfigurations.value })
      .from(tenantConfigurations)
      .where(
        and(
          eq(tenantConfigurations.tenantId, tenantId),
          eq(tenantConfigurations.category, TUDICO_CATEGORY),
          like(tenantConfigurations.key, `tudico:${prefix}:%`),
        ),
      )
      .orderBy(asc(tenantConfigurations.createdAt));

    return rows.map((row) => row.value as T);
  }

  async getById<T>(tenantId: string, prefix: string, id: string): Promise<T | null> {
    const db = await getDb();
    const rows = await db
      .select({ value: tenantConfigurations.value })
      .from(tenantConfigurations)
      .where(
        and(
          eq(tenantConfigurations.tenantId, tenantId),
          eq(tenantConfigurations.category, TUDICO_CATEGORY),
          eq(tenantConfigurations.key, buildKey(prefix, id)),
        ),
      )
      .limit(1);

    return rows.length > 0 ? (rows[0].value as T) : null;
  }

  async upsert(tenantId: string, prefix: string, id: string, value: RawConfigValue, createdBy: string): Promise<void> {
    const db = await getDb();
    await db
      .insert(tenantConfigurations)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        key: buildKey(prefix, id),
        category: TUDICO_CATEGORY,
        value,
        createdBy,
      })
      .onDuplicateKeyUpdate({
        set: {
          value,
          createdBy,
        },
      });
  }
}

export const tudicoRepository = new TudicoRepository();
