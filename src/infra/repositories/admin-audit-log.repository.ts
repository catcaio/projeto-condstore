import { randomUUID } from 'crypto';
import { getDb } from '../db';
import { adminAuditLog } from '../../drizzle/schema';

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
      id: randomUUID(),
      tenantId,
      userId,
      action,
      metadata: input.metadata ?? null,
      createdAt: input.createdAt ?? new Date(),
    });
  }
}

export const adminAuditLogRepository = new AdminAuditLogRepository();

