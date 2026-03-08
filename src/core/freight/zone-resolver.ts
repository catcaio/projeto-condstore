import { getDb } from '../../infra/db';
import { carrierZones } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../infra/logger';

// ─── CEP → State mapping ───────────────────────────────────────────────────

const CEP_STATE_MAP: [number, number, string][] = [
    [1000000, 19999999, 'SP'],
    [20000000, 28999999, 'RJ'],
    [29000000, 29999999, 'ES'],
    [30000000, 39999999, 'MG'],
    [40000000, 48999999, 'BA'],
    [49000000, 49999999, 'SE'],
    [50000000, 56999999, 'PE'],
    [57000000, 57999999, 'AL'],
    [58000000, 58999999, 'PB'],
    [59000000, 59999999, 'RN'],
    [60000000, 63999999, 'CE'],
    [64000000, 64999999, 'PI'],
    [65000000, 65999999, 'MA'],
    [66000000, 68899999, 'PA'],
    [68900000, 68999999, 'AP'],
    [69000000, 69299999, 'AM'],
    [69300000, 69399999, 'RR'],
    [69400000, 69899999, 'AM'],
    [69900000, 69999999, 'AC'],
    [70000000, 72799999, 'DF'],
    [72800000, 76799999, 'GO'],
    [76800000, 76999999, 'RO'],
    [77000000, 77999999, 'TO'],
    [78000000, 78899999, 'MT'],
    [79000000, 79999999, 'MS'],
    [80000000, 87999999, 'PR'],
    [88000000, 89999999, 'SC'],
    [90000000, 99999999, 'RS'],
];

export function extractStateFromCep(cep: string): string | null {
    const num = parseInt(cep.replace(/\D/g, ''), 10);
    for (const [start, end, state] of CEP_STATE_MAP) {
        if (num >= start && num <= end) return state;
    }
    return null;
}

export function isCapitalCep(cep: string, state: string): boolean {
    const num = parseInt(cep.replace(/\D/g, ''), 10);
    // Standard basic blocks for main capitals
    const capitalRanges: Record<string, [number, number]> = {
        SP: [1000000, 8999999], RJ: [20000000, 23999999], MG: [30000000, 31999999],
        PR: [80000000, 82999999], RS: [90000000, 91999999], SC: [88000000, 88999999],
        BA: [40000000, 41999999], CE: [60000000, 61999999], PE: [50000000, 52999999],
    };
    const range = capitalRanges[state];
    if (!range) return false;
    return num >= range[0] && num <= range[1];
}

interface ResolveZoneInput {
    tenantId: string;
    carrierName: string;
    cep: string;
}

/**
 * Resolves a destination CEP into a formal carrier zoneCode.
 * Required for integrating flat-table carriers with the freight quote engine.
 */
export async function resolveCarrierZone({ tenantId, carrierName, cep }: ResolveZoneInput): Promise<string | null> {
    const state = extractStateFromCep(cep);
    if (!state) {
        logger.debug(`zone_resolver: could not extract state for CEP ${cep}`);
        return null; // Unknown or invalid CEP
    }

    const cepNum = cep.replace(/\D/g, '').padEnd(8, '0');
    const db = await getDb();

    // 1. Fetch all zones active for this state and carrier
    const zones = await db.select().from(carrierZones).where(and(
        eq(carrierZones.tenantId, tenantId),
        eq(carrierZones.carrierName, carrierName),
        eq(carrierZones.state, state),
        eq(carrierZones.isActive, true),
    ));

    if (zones.length === 0) {
        return null; // Carrier does not serve this state or operates purely on global bands
    }
    if (zones.length === 1) {
        return zones[0].zoneCode; // Fast path: only 1 zone defined for the whole state (e.g., "SC1")
    }

    // 2. Exact CEP Range Matching First (highest priority)
    for (const z of zones) {
        if (z.cepRangeStart && z.cepRangeEnd) {
            if (cepNum >= z.cepRangeStart && cepNum <= z.cepRangeEnd) return z.zoneCode;
        }
    }

    // 3. Capital vs Interior Check
    const isCap = isCapitalCep(cep, state);
    const capZone = zones.find(z => z.capitalOrInterior === 'CAPITAL');
    const intZone = zones.find(z => z.capitalOrInterior === 'INTERIOR');

    if (isCap && capZone) return capZone.zoneCode;
    if (!isCap && intZone) return intZone.zoneCode;

    // 4. Default Fallback
    logger.warn(`zone_resolver: no exact condition met for ${carrierName} in ${state} with multiple zones. Falling back to first.`);
    return zones[0].zoneCode;
}
