import { getDb } from '@/infra/db';
import { userUiPrefs } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

const PINS_KEY = 'cockpit.launcher.pins';

export interface UserUiPrefsPayload {
    pinnedModuleIds: string[];
}

export class UserUiPrefsRepository {
    async getPins(tenantId: string, userId: string): Promise<string[]> {
        const db = await getDb();
        const [record] = await db
            .select({ payloadJson: userUiPrefs.payloadJson })
            .from(userUiPrefs)
            .where(
                and(
                    eq(userUiPrefs.tenantId, tenantId),
                    eq(userUiPrefs.userId, userId),
                    eq(userUiPrefs.key, PINS_KEY)
                )
            )
            ;

        if (!record || !record.payloadJson) {
            return [];
        }

        const payload = record.payloadJson as UserUiPrefsPayload;
        return payload.pinnedModuleIds || [];
    }

    async setPins(tenantId: string, userId: string, pinnedModuleIds: string[]): Promise<void> {
        const payload: UserUiPrefsPayload = { pinnedModuleIds };

        const db = await getDb();
        await db
            .insert(userUiPrefs)
            .values({
                tenantId,
                userId,
                key: PINS_KEY,
                payloadJson: payload,
            })
            .onDuplicateKeyUpdate({
                set: {
                    payloadJson: payload,
                    updatedAt: new Date(),
                },
            });
    }
}

export const userUiPrefsRepository = new UserUiPrefsRepository();
