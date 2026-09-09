/**
 * FRK-8/008 — Tenant preferences persistence (same dual-store pattern).
 *
 * Per-tenant operator settings: which suggestion types are disabled and the
 * minimum confidence for a suggestion to be shown. Tenant-scoped, fail
 * closed. Defaults are applied when no row exists yet.
 */
import {
  assertMinConfidence,
  assertSuggestionType,
  DEFAULT_MIN_CONFIDENCE,
  type FrankSuggestionType,
  type FrankTenantPreferences,
} from './frank-intelligence.types';

export interface TenantPreferencesStore {
  getPreferences(tenantId: string): Promise<FrankTenantPreferences>;
  setPreferences(tenantId: string, prefs: { disabledTypes?: FrankSuggestionType[]; minConfidence?: number }): Promise<FrankTenantPreferences>;
}

function defaults(tenantId: string): FrankTenantPreferences {
  return { tenantId, disabledTypes: [], minConfidence: DEFAULT_MIN_CONFIDENCE };
}

// ─── In-memory ──────────────────────────────────────────────────────────────

export class InMemoryTenantPreferencesStore implements TenantPreferencesStore {
  private prefs = new Map<string, FrankTenantPreferences>();

  async getPreferences(tenantId: string): Promise<FrankTenantPreferences> {
    return structuredClone(this.prefs.get(tenantId) ?? defaults(tenantId));
  }

  async setPreferences(tenantId: string, prefs: { disabledTypes?: FrankSuggestionType[]; minConfidence?: number }): Promise<FrankTenantPreferences> {
    const current = this.prefs.get(tenantId) ?? defaults(tenantId);
    const next: FrankTenantPreferences = {
      tenantId,
      disabledTypes: prefs.disabledTypes ?? current.disabledTypes,
      minConfidence: prefs.minConfidence ?? current.minConfidence,
    };
    for (const t of next.disabledTypes) assertSuggestionType(t);
    assertMinConfidence(next.minConfidence);
    this.prefs.set(tenantId, structuredClone(next));
    return structuredClone(next);
  }
}

// ─── Drizzle ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prefsDb: any = null;

async function getPrefsDb(): Promise<any> {
  if (prefsDb) return prefsDb;
  const poolConfig = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  if (!poolConfig) throw new Error('DATABASE_URL is not defined');
  const { default: mysql } = await import('mysql2/promise');
  const { drizzle } = await import('drizzle-orm/mysql2');
  const pool = mysql.createPool({ uri: poolConfig });
  prefsDb = drizzle(pool, { mode: 'default' });
  return prefsDb;
}

export class DrizzleTenantPreferencesStore implements TenantPreferencesStore {
  async getPreferences(tenantId: string): Promise<FrankTenantPreferences> {
    const db = await getPrefsDb();
    const { frankPreferences } = await import('@/drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const rows = await db.select().from(frankPreferences).where(eq(frankPreferences.tenantId, tenantId));
    if (rows.length === 0) return defaults(tenantId);
    const row = rows[0];
    return {
      tenantId: row.tenantId,
      disabledTypes: JSON.parse(row.disabledTypesJson) as FrankSuggestionType[],
      minConfidence: Number(row.minConfidence),
    };
  }

  async setPreferences(tenantId: string, prefs: { disabledTypes?: FrankSuggestionType[]; minConfidence?: number }): Promise<FrankTenantPreferences> {
    for (const t of prefs.disabledTypes ?? []) assertSuggestionType(t);
    if (prefs.minConfidence !== undefined) assertMinConfidence(prefs.minConfidence);

    const db = await getPrefsDb();
    const { frankPreferences } = await import('@/drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const current = await this.getPreferences(tenantId);
    const next: FrankTenantPreferences = {
      tenantId,
      disabledTypes: prefs.disabledTypes ?? current.disabledTypes,
      minConfidence: prefs.minConfidence ?? current.minConfidence,
    };
    const values = {
      disabledTypesJson: JSON.stringify(next.disabledTypes),
      minConfidence: String(next.minConfidence),
    };
    const existing = await db.select({ tenantId: frankPreferences.tenantId }).from(frankPreferences).where(eq(frankPreferences.tenantId, tenantId));
    if (existing.length > 0) {
      await db.update(frankPreferences).set(values).where(eq(frankPreferences.tenantId, tenantId));
    } else {
      await db.insert(frankPreferences).values({ tenantId, ...values });
    }
    return next;
  }
}