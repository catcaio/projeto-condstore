import { getDb } from '../db';
import { inboundMessageDedup } from '../../drizzle/schema';

function isDuplicateEntryError(error: unknown): boolean {
  const anyError = error as { code?: string; message?: string };
  return anyError?.code === 'ER_DUP_ENTRY' || Boolean(anyError?.message?.includes('Duplicate entry'));
}

export class InboundMessageDedupRepository {
  async tryAcquire(messageSid: string, tenantId: string): Promise<boolean> {
    const normalizedMessageSid = messageSid.trim();
    const normalizedTenantId = tenantId.trim();

    if (!normalizedMessageSid) {
      throw new Error('messageSid is required');
    }
    if (!normalizedTenantId) {
      throw new Error('tenantId is required');
    }

    try {
      const db = await getDb();
      await db.insert(inboundMessageDedup).values({
        messageSid: normalizedMessageSid,
        tenantId: normalizedTenantId,
      });
      return true;
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return false;
      }
      throw error;
    }
  }
}

export const inboundMessageDedupRepository = new InboundMessageDedupRepository();

