import { getDb } from '../db';
import { eq, or, like } from 'drizzle-orm';
import { tenants, type TenantRecord } from '../../drizzle/schema';
import { logger } from '../logger';
import { ErrorCode, InfrastructureError, BusinessError } from '../errors';

/**
 * In-memory cache for tenant lookups.
 * TTL: 10 minutes (configurable via env var)
 */
interface CachedTenant {
    tenant: TenantRecord;
    expiresAt: number;
}

class TenantCache {
    private cache: Map<string, CachedTenant> = new Map();
    private ttlMs: number;

    constructor(ttlMinutes: number = 10) {
        this.ttlMs = ttlMinutes * 60 * 1000;

        // Cleanup expired entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    get(twilioNumber: string): TenantRecord | null {
        const cached = this.cache.get(twilioNumber);

        if (!cached) return null;

        if (Date.now() > cached.expiresAt) {
            this.cache.delete(twilioNumber);
            return null;
        }

        return cached.tenant;
    }

    set(twilioNumber: string, tenant: TenantRecord): void {
        this.cache.set(twilioNumber, {
            tenant,
            expiresAt: Date.now() + this.ttlMs,
        });
    }

    invalidate(twilioNumber: string): void {
        this.cache.delete(twilioNumber);
    }

    clear(): void {
        this.cache.clear();
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now > value.expiresAt) {
                this.cache.delete(key);
            }
        }
        logger.debug('Tenant cache cleanup completed', {
            remainingEntries: this.cache.size,
        });
    }
}

export class TenantRepository {
    private cache: TenantCache;

    constructor() {
        // TTL from env var or default to 10 minutes
        const ttlMinutes = parseInt(process.env.TENANT_CACHE_TTL_MINUTES || '10', 10);
        this.cache = new TenantCache(ttlMinutes);

        logger.info('TenantRepository initialized', { cacheTtlMinutes: ttlMinutes });
    }

    /**
     * Resolve tenant by Twilio number with strict logging and normalization.
     * Guaranteed to return a tenant or throw a descriptive error.
     */
    async resolveTenantByTwilioNumber(rawTwilioNumber: string): Promise<TenantRecord> {
        const correlationId = `TR-${Date.now().toString(36)}`;

        // 1. Normalization
        const normalizedNumber = this.normalize(rawTwilioNumber);

        logger.info(`[${correlationId}] Starting tenant resolution`, {
            raw: '***' + rawTwilioNumber.slice(-4), // Simple mask here as logger.maskPhone might not be available or I should use it if I export it. logger is imported.
            normalized: '***' + normalizedNumber.slice(-4)
        });

        // 2. Cache Lookup
        const cached = this.cache.get(normalizedNumber);
        if (cached) {
            logger.info(`[${correlationId}] Tenant resolved from CACHE`, { tenantId: cached.id });
            return cached;
        }

        // 3. Database Lookup
        try {
            const db = await getDb();

            logger.debug(`[${correlationId}] Executing DB query`, {
                query: `SELECT * FROM tenants WHERE twilio_number = '${normalizedNumber}'`
            });

            const results = await db
                .select()
                .from(tenants)
                .where(eq(tenants.twilioNumber, normalizedNumber))
                .limit(1);

            if (results.length === 0) {
                // Log all tenants for diagnosis if not found
                const allTenants = await this.getAllTenants();
                logger.warn(`[${correlationId}] Tenant NOT FOUND`, {
                    searchedFor: normalizedNumber,
                    availableTenants: allTenants.map(t => `${t.name} (${t.twilioNumber})`)
                });

                throw new BusinessError(
                    ErrorCode.TENANT_NOT_FOUND,
                    `Tenant not found for number: ${normalizedNumber}`
                );
            }

            const tenant = results[0];

            // 4. Cache Update
            this.cache.set(normalizedNumber, tenant);

            logger.info(`[${correlationId}] Tenant resolved successfully from DB`, {
                tenantId: tenant.id,
                name: tenant.name
            });

            return tenant;

        } catch (error) {
            // Enhanced error logging
            if (error instanceof BusinessError) throw error;

            console.error(`[${correlationId}] CRITICAL DATABASE ERROR:`, error);
            logger.error(`[${correlationId}] Database error during tenant resolution`, error as Error);

            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to resolve tenant due to database error'
            );
        }
    }

    /**
     * Helper: Normalize Twilio number (Centralized logic)
     * Enforces 'whatsapp:' prefix, lowercase, and removes spaces.
     */
    private normalize(input: string): string {
        if (!input) return '';

        // Remove spaces and lowercase
        let cleaned = input.trim().toLowerCase().replace(/\s+/g, '');

        // Ensure standard prefix
        if (!cleaned.startsWith('whatsapp:')) {
            // Check if it has a + but no whatsapp: prefix
            if (cleaned.startsWith('+')) {
                cleaned = `whatsapp:${cleaned}`;
            } else {
                // Assuming it's a raw number without + or prefix
                cleaned = `whatsapp:+${cleaned.replace(/^whatsapp:/, '')}`;
            }
        }

        return cleaned;
    }

    /**
     * Legacy method - Alias to new robust method
     * @deprecated Use resolveTenantByTwilioNumber instead
     */
    async getTenantByTwilioNumber(twilioNumber: string): Promise<TenantRecord | null> {
        try {
            return await this.resolveTenantByTwilioNumber(twilioNumber);
        } catch (error) {
            return null; // Maintain legacy behavior of returning null on failure
        }
    }

    /**
     * Helper: Normalize Slug (Centralized logic)
     * Enforces lowercase and removes spaces.
     */
    private normalizeSlug(input: string): string {
        if (!input) return '';
        return input.trim().toLowerCase().replace(/\s+/g, '-');
    }

    /**
     * Resolve tenant by Slug with strict logging and normalization.
     */
    async resolveTenantBySlug(rawSlug: string): Promise<TenantRecord> {
        const correlationId = `SLUG-${Date.now().toString(36)}`;

        // 1. Normalization
        const normalizedSlug = this.normalizeSlug(rawSlug);

        // 2. Cache Lookup (Reusing existing memory strategy, keyed by explicit prefix)
        const cacheKey = `slug:${normalizedSlug}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            logger.info(`[${correlationId}] Tenant resolved from CACHE via Slug`, { tenantId: cached.id });
            return cached;
        }

        // 3. Database Lookup
        try {
            const db = await getDb();

            const results = await db
                .select()
                .from(tenants)
                .where(eq(tenants.slug, normalizedSlug))
                .limit(1);

            if (results.length === 0) {
                throw new BusinessError(
                    ErrorCode.TENANT_NOT_FOUND,
                    `Tenant not found for slug: ${normalizedSlug}`
                );
            }

            const tenant = results[0];

            // 4. Cache Update
            this.cache.set(cacheKey, tenant);

            return tenant;

        } catch (error) {
            if (error instanceof BusinessError) throw error;

            logger.error(`[${correlationId}] Database error during tenant slug resolution`, error as Error);
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to resolve tenant due to database error'
            );
        }
    }

    /**
     * Get tenant by ID.
     */
    async getTenantById(tenantId: string): Promise<TenantRecord | null> {
        try {
            const db = await getDb();
            const results = await db
                .select()
                .from(tenants)
                .where(eq(tenants.id, tenantId))
                .limit(1);

            return results.length > 0 ? results[0] : null;
        } catch (error) {
            logger.error('Failed to get tenant by ID', error as Error, { tenantId });
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to get tenant',
                { tenantId }
            );
        }
    }

    async updateTenantTimezone(tenantId: string, timezone: string): Promise<void> {
        try {
            const db = await getDb();
            await db
                .update(tenants)
                .set({ timezone })
                .where(eq(tenants.id, tenantId));
        } catch (error) {
            logger.error('Failed to update tenant timezone', error as Error, { tenantId, timezone });
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to update tenant timezone',
                { tenantId, timezone }
            );
        }
    }

    async updateOutboundEnabled(tenantId: string, outboundEnabled: boolean): Promise<void> {
        try {
            const db = await getDb();
            await db
                .update(tenants)
                .set({ outboundEnabled })
                .where(eq(tenants.id, tenantId));
        } catch (error) {
            logger.error('Failed to update tenant outbound status', error as Error, { tenantId, outboundEnabled });
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to update tenant outbound status',
                { tenantId, outboundEnabled }
            );
        }
    }

    async updateIncidentMode(tenantId: string, incidentMode: boolean): Promise<void> {
        try {
            const db = await getDb();
            await db
                .update(tenants)
                .set({ incidentMode })
                .where(eq(tenants.id, tenantId));
        } catch (error) {
            logger.error('Failed to update tenant incident mode', error as Error, { tenantId, incidentMode });
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to update tenant incident mode',
                { tenantId, incidentMode }
            );
        }
    }

    /**
     * Invalidate cache for a specific Twilio number.
     */
    invalidateCache(twilioNumber: string): void {
        this.cache.invalidate(this.normalize(twilioNumber));
        logger.debug('Tenant cache invalidated', { twilioNumber });
    }

    /**
     * Clear entire cache.
     */
    clearCache(): void {
        this.cache.clear();
        logger.info('Tenant cache cleared');
    }

    /**
     * Get all tenants (for debugging only).
     */
    async getAllTenants(): Promise<TenantRecord[]> {
        try {
            const db = await getDb();
            const results = await db.select().from(tenants);
            return results;
        } catch (error) {
            logger.error('Failed to get all tenants', error as Error);
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to get all tenants',
                { originalError: (error as Error).message }
            );
        }
    }
}

export const tenantRepository = new TenantRepository();
