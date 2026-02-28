import { getDb } from '../db';
import { adminAuditLog } from '../../drizzle/schema';
import { and, desc, eq, gte, lte } from 'drizzle-orm';

export interface AdminAuditLogInput {
  tenantId: string;
  userId: string;
  action: string;
  metadata?: unknown;
  createdAt?: Date;
}

function trimOrThrow(value: string, field: string, maxLength: number): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized.slice(0, maxLength);
}

export class AdminAuditLogRepository {
  async log(input: AdminAuditLogInput): Promise<void> {
    const tenantId = trimOrThrow(input.tenantId, 'tenantId', 36);
    const userId = trimOrThrow(input.userId, 'userId', 36);
    const action = trimOrThrow(input.action, 'action', 64);

    const db = await getDb();
    await db.insert(adminAuditLog).values({
      id: crypto.randomUUID(),
      tenantId,
      userId,
      action,
      metadata: input.metadata ?? null,
      createdAt: input.createdAt ?? new Date(),
    });
  }

  async list(tenantId: string, filters: { action?: string; userId?: string; from?: Date; to?: Date; page?: number; limit?: number }) {
    const db = await getDb();
    const conditions = [eq(adminAuditLog.tenantId, tenantId)];

    if (filters.action) conditions.push(eq(adminAuditLog.action, filters.action));
    if (filters.userId) conditions.push(eq(adminAuditLog.userId, filters.userId));
    if (filters.from) conditions.push(gte(adminAuditLog.createdAt, filters.from));
    if (filters.to) conditions.push(lte(adminAuditLog.createdAt, filters.to));

    const offset = ((filters.page || 1) - 1) * (filters.limit || 50);

    const data = await db.select()
      .from(adminAuditLog)
      .where(and(...conditions))
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(filters.limit || 50)
      .offset(offset);

    return data;
  }
}

export const adminAuditLogRepository = new AdminAuditLogRepository();

