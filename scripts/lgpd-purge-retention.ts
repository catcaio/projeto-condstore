import "dotenv/config";
import { getDb } from "../src/infra/db";
import { endUserConsents, messages, freightFunnelEvents } from "../src/drizzle/schema";
import { eq, and, sql, lt } from "drizzle-orm";

const PURGE_DAYS = parseInt(process.env.LGPD_UNCONSENTED_RETENTION_DAYS || "30", 10);

async function purgeUnconsentedData() {
    console.log(`[LGPD] Starting retention purge. Deleting unconsented records older than ${PURGE_DAYS} days.`);

    const db = await getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - PURGE_DAYS);

    let purgedUsersCount = 0;
    let purgedMessagesCount = 0;

    // Find users who have explicit consentGiven = false OR never gave consent and their last interaction is old.
    // By LGPD rules, if they explicitly denied, or if their unconsented data sat for > 30 days, we purge it.
    // We will find all distinct `tenantId, phoneHash` combinations from `messages` older than PURGE_DAYS 
    // that DO NOT have a `true` record in `endUserConsents`.

    // As a simplification for the script: 
    // Let's wipe all messages older than cutoffDate WHERE the phoneHash is not consented.

    try {
        const query = sql`
            DELETE m
            FROM messages m
            LEFT JOIN end_user_consents euc 
                ON m.tenant_id = euc.tenant_id AND m.phone_hash = euc.phone_hash
            WHERE m.created_at < ${cutoffDate}
              AND (euc.consent_given IS NULL OR euc.consent_given = false)
        `;

        const [result] = await db.execute(query);
        purgedMessagesCount = (result as any).affectedRows || 0;

        console.log(`[LGPD] Purge complete. Deleted ${purgedMessagesCount} stale unconsented conversational vectors.`);
        process.exit(0);
    } catch (error) {
        console.error("[LGPD] Fatal error during retention purge:", error);
        process.exit(1);
    }
}

purgeUnconsentedData();
