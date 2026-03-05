import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { endUserConsents, userConsentsLog } from '../../drizzle/schema';
import { randomUUID } from 'crypto';

export const endUserConsentRepository = {
    async getConsent(tenantId: string, phoneHash: string) {
        const db = await getDb();
        const [record] = await db
            .select()
            .from(endUserConsents)
            .where(and(eq(endUserConsents.tenantId, tenantId), eq(endUserConsents.phoneHash, phoneHash)))
            ;
        return record || null;
    },

    async recordOptIn(tenantId: string, phoneHash: string, source: string, ipHash?: string) {
        const db = await getDb();
        const now = new Date();

        // Use transaction to update both state and log
        await db.transaction(async (tx) => {
            // Upsert the main consent record
            await tx
                .insert(endUserConsents)
                .values({
                    tenantId,
                    phoneHash,
                    consentGiven: true,
                    consentTimestamp: now,
                    consentSource: source,
                    createdAt: now,
                    updatedAt: now,
                })
                .onDuplicateKeyUpdate({
                    set: {
                        consentGiven: true,
                        consentTimestamp: now,
                        consentSource: source,
                        updatedAt: now,
                    }
                });

            // Insert audit log
            await tx.insert(userConsentsLog).values({
                id: randomUUID(),
                tenantId,
                phoneHash,
                consentGiven: true,
                timestamp: now,
                ipHash: ipHash || null,
                source,
            });
        });
    },

    async revokeConsent(tenantId: string, phoneHash: string, source: string, ipHash?: string) {
        const db = await getDb();
        const now = new Date();

        await db.transaction(async (tx) => {
            await tx
                .update(endUserConsents)
                .set({
                    consentGiven: false,
                    updatedAt: now,
                })
                .where(
                    and(
                        eq(endUserConsents.tenantId, tenantId),
                        eq(endUserConsents.phoneHash, phoneHash)
                    )
                );

            await tx.insert(userConsentsLog).values({
                id: randomUUID(),
                tenantId,
                phoneHash,
                consentGiven: false,
                timestamp: now,
                ipHash: ipHash || null,
                source,
            });
        });
    },

    async incrementBlockedAttempts(tenantId: string, phoneHash: string) {
        const db = await getDb();
        const now = new Date();

        await db.insert(endUserConsents)
            .values({
                tenantId,
                phoneHash,
                consentGiven: false,
                blockedAttempts: 1,
                createdAt: now,
                updatedAt: now,
            })
            .onDuplicateKeyUpdate({
                set: {
                    blockedAttempts: sql`${endUserConsents.blockedAttempts} + 1`,
                    updatedAt: now,
                }
            });
    }
};
