/**
 * Operational Settings Loader — with in-memory cache.
 *
 * Loads freight/packing operational settings from the DB (cockpit-managed).
 * Falls back to safe defaults when DB values are not set.
 *
 * Cache: 60s TTL per tenant. Invalidated by invalidateSettingsCache().
 */

import { getDb } from '../../infra/db';
import { freightOperationalSettings } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// ─── Default values (used as fallback if not in DB) ─────────────────────────

export const DEFAULTS = {
    // Packing
    max_identical_per_volume: 3,
    stacking_increment_cm: 10,
    max_volume_length_cm: 300,
    max_volume_width_cm: 200,
    max_volume_height_cm: 200,
    absorb_smaller_items: true,
    absorb_weight_only: true,

    // Simulator
    default_origin_cep: '88131640',
    default_cubage_factor: 300,
    default_unit_weight_kg: 0.3,

    // Freight
    max_freight_options: 3,
} as const;

export type SettingKey = keyof typeof DEFAULTS;

// ─── Cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000; // 60 seconds

interface CacheEntry {
    settings: OperationalSettings;
    ruleVersion: number;
    cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(tenantId: string): string {
    return `operational_settings:${tenantId}`;
}

/**
 * Invalidate the settings cache for a tenant.
 * Call this after PATCH /api/internal/freight/operational-settings.
 */
export function invalidateSettingsCache(tenantId: string): void {
    cache.delete(cacheKey(tenantId));
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OperationalSettings {
    maxIdenticalPerVolume: number;
    stackingIncrementCm: number;
    maxVolumeLengthCm: number;
    maxVolumeWidthCm: number;
    maxVolumeHeightCm: number;
    absorbSmallerItems: boolean;
    absorbWeightOnly: boolean;
    defaultOriginCep: string;
    defaultCubageFactor: number;
    defaultUnitWeightKg: number;
    maxFreightOptions: number;
    /** Current rule version from DB (0 if not set) */
    ruleVersion: number;
}

/**
 * Load operational settings for a tenant from DB, with 60s cache.
 * Merges DB values with safe defaults.
 */
export async function loadOperationalSettings(tenantId: string): Promise<OperationalSettings> {
    const key = cacheKey(tenantId);
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
        return cached.settings;
    }

    let dbSettings: Record<string, string> = {};
    let ruleVersion = 0;

    try {
        const db = await getDb();
        const rows = await db.select().from(freightOperationalSettings).where(
            and(
                eq(freightOperationalSettings.tenantId, tenantId),
                eq(freightOperationalSettings.isActive, true),
            ),
        );
        for (const row of rows) {
            dbSettings[row.settingKey] = row.settingValue;
            // Track the highest rule version across all settings
            const rv = (row as any).ruleVersion;
            if (typeof rv === 'number' && rv > ruleVersion) ruleVersion = rv;
        }
    } catch {
        // DB not available — use all defaults
    }

    const getNum = (k: SettingKey): number =>
        dbSettings[k] !== undefined ? parseFloat(dbSettings[k]) : DEFAULTS[k] as number;

    const getBool = (k: SettingKey): boolean =>
        dbSettings[k] !== undefined ? dbSettings[k] === 'true' : DEFAULTS[k] as boolean;

    const getStr = (k: SettingKey): string =>
        dbSettings[k] !== undefined ? dbSettings[k] : DEFAULTS[k] as string;

    const settings: OperationalSettings = {
        maxIdenticalPerVolume: getNum('max_identical_per_volume'),
        stackingIncrementCm: getNum('stacking_increment_cm'),
        maxVolumeLengthCm: getNum('max_volume_length_cm'),
        maxVolumeWidthCm: getNum('max_volume_width_cm'),
        maxVolumeHeightCm: getNum('max_volume_height_cm'),
        absorbSmallerItems: getBool('absorb_smaller_items'),
        absorbWeightOnly: getBool('absorb_weight_only'),
        defaultOriginCep: getStr('default_origin_cep'),
        defaultCubageFactor: getNum('default_cubage_factor'),
        defaultUnitWeightKg: getNum('default_unit_weight_kg'),
        maxFreightOptions: getNum('max_freight_options'),
        ruleVersion,
    };

    cache.set(key, { settings, ruleVersion, cachedAt: Date.now() });
    return settings;
}
