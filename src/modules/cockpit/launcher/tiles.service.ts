import { Role } from '@/ui/auth/entitlements-logic';
import {
    COCKPIT_TILES,
    SALAS_PADRAO,
    MARCIANO_TILES,
    MARCIANO_SALAS,
    CockpitTile,
    CockpitSala
} from './tiles.registry';

export interface VisibleSala extends CockpitSala {
    tiles: CockpitTile[];
}

interface CalculateVisibleTilesProps {
    tenantId: string;
    role: Role;
}
import { getDb } from '@/infra/db';
import { tenants, domineEvents } from '@/drizzle/schema';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Returns a sorted List of Salas (sectors), each containing the Tiles
 * the user is permitted to see based on their role. Empty Salas are omitted.
 */
export async function getVisibleTiles({ tenantId, role }: CalculateVisibleTilesProps): Promise<{ salas: VisibleSala[] }> {
    // Determine which registry to use. If internal tenant, use LOJACOND presets. Else use MARCIANO presets.
    const isInternal = tenantId.startsWith('lojacond');
    // Clone tiles to avoid mutating the constant registry
    const sourceTiles = isInternal ? COCKPIT_TILES.map(t => ({ ...t })) : MARCIANO_TILES.map(t => ({ ...t }));
    const sourceSalas = isInternal ? SALAS_PADRAO : MARCIANO_SALAS;

    let dlqDepth = 0;
    let incidentMode = false;

    if (isInternal) {
        try {
            const db = await getDb();
            const dlqResult = await db.select({ count: sql<number>`count(*)` })
                .from(domineEvents)
                .where(and(eq(domineEvents.tenantId, tenantId), eq(domineEvents.status, 'failed')));
            dlqDepth = Number(dlqResult[0]?.count || 0);

            const tenantResult = await db.select({ incidentMode: tenants.incidentMode })
                .from(tenants)
                .where(eq(tenants.id, tenantId))
                .limit(1);
            incidentMode = tenantResult[0]?.incidentMode || false;
        } catch (e) {
            console.error('Failed to augment tile badges', e);
        }
    }

    // 1. Filter tiles based on RBAC
    const userAllowedTiles = sourceTiles.filter((tile) => {
        // If no roles specified, it's public (or broadly internal)
        if (!tile.required.roles || tile.required.roles.length === 0) {
            return true;
        }

        // Check if user's role intersects with required ones
        return tile.required.roles.includes(role);
    });

    // Inject Badges dynamically
    if (isInternal) {
        for (const tile of userAllowedTiles) {
            if (tile.id === 'domine' && dlqDepth > 0) {
                tile.badge = { type: 'danger', label: `${dlqDepth} DLQ` };
            }
            if (tile.id === 'status' && incidentMode) {
                tile.badge = { type: 'danger', label: 'INCIDENT' };
            }
        }
    }

    // 2. Group these tiles into their respective Salas
    const salasList: VisibleSala[] = [];

    for (const sala of sourceSalas) {
        const tilesForSala = userAllowedTiles.filter((t) => t.salaId === sala.id);

        if (tilesForSala.length > 0) {
            // Sort the tiles by 'order' property locally
            tilesForSala.sort((a, b) => a.order - b.order);

            salasList.push({
                ...sala,
                tiles: tilesForSala,
            });
        }
    }

    // 3. Sort the Salas globally by their 'order' property
    salasList.sort((a, b) => a.order - b.order);

    return { salas: salasList };
}
