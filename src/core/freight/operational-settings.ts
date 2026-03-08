/**
 * Operational Settings Loader.
 *
 * Loads freight/packing operational settings from the DB (cockpit-managed).
 * Falls back to safe defaults when DB values are not set.
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

// ─── Loader ─────────────────────────────────────────────────────────────────

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
}

/**
 * Load operational settings for a tenant from DB.
 * Merges DB values with safe defaults.
 */
export async function loadOperationalSettings(tenantId: string): Promise<OperationalSettings> {
    let dbSettings: Record<string, string> = {};

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
        }
    } catch {
        // DB not available — use all defaults
    }

    const getNum = (key: SettingKey): number =>
        dbSettings[key] !== undefined ? parseFloat(dbSettings[key]) : DEFAULTS[key] as number;

    const getBool = (key: SettingKey): boolean =>
        dbSettings[key] !== undefined ? dbSettings[key] === 'true' : DEFAULTS[key] as boolean;

    const getStr = (key: SettingKey): string =>
        dbSettings[key] !== undefined ? dbSettings[key] : DEFAULTS[key] as string;

    return {
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
    };
}
