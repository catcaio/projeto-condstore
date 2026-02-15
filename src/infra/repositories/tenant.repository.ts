import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import { tenants, type TenantRecord } from '../../drizzle/schema';
import { logger } from '../logger';
import { ErrorCode, InfrastructureError, BusinessError } from '../errors';

// Database connection singleton (reuse pattern from other repositories)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;

async function getDb() {
    if (dbInstance) return dbInstance;

    if (!process.env.DATABASE_URL) {
        throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'DATABASE_URL is not defined'
        );
    }

    const connectionPool = mysql.createPool(process.env.DATABASE_URL);
    dbInstance = drizzle(connectionPool, { mode: 'default' });

    try {
        const conn = await connectionPool.getConnection();
        logger.info('TenantRepository: DB connected successfully');
        conn.release();
    } catch (err) {
        logger.error('TenantRepository: DB connection failed', err as Error);
        throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'Database connection verification failed',
            { error: (err as Error).message }
        );
    }

    return dbInstance;
}

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
     * Get tenant by Twilio number.
     * Uses in-memory cache with TTL, DB as source of truth.
     */
    async getTenantByTwilioNumber(twilioNumber: string): Promise<TenantRecord | null> {
        // Check cache first
        const cached = this.cache.get(twilioNumber);
        if (cached) {
            logger.debug('Tenant found in cache', { twilioNumber, tenantId: cached.id });
            return cached;
        }

        // Query database
        try {
            const db = await getDb();
            const results = await db
                .select()
                .from(tenants)
                .where(eq(tenants.twilioNumber, twilioNumber))
                .limit(1);

            if (results.length === 0) {
                logger.warn('Tenant not found for Twilio number', { twilioNumber });
                return null;
            }

            const tenant = results[0];

            // Cache the result
            this.cache.set(twilioNumber, tenant);

            logger.info('Tenant resolved from DB', {
                twilioNumber,
                tenantId: tenant.id,
                tenantName: tenant.name,
            });

            return tenant;
        } catch (error) {
            logger.error('Failed to get tenant by Twilio number', error as Error, {
                twilioNumber,
            });
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to resolve tenant',
                { twilioNumber }
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

    /**
     * Invalidate cache for a specific Twilio number.
     */
    invalidateCache(twilioNumber: string): void {
        this.cache.invalidate(twilioNumber);
        logger.debug('Tenant cache invalidated', { twilioNumber });
    }

    /**
     * Clear entire cache.
     */
    clearCache(): void {
        this.cache.clear();
        logger.info('Tenant cache cleared');
    }
}

export const tenantRepository = new TenantRepository();
