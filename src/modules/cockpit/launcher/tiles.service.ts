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

/**
 * Returns a sorted List of Salas (sectors), each containing the Tiles
 * the user is permitted to see based on their role. Empty Salas are omitted.
 */
export function getVisibleTiles({ tenantId, role }: CalculateVisibleTilesProps): { salas: VisibleSala[] } {
    // Determine which registry to use. If internal tenant, use LOJACOND presets. Else use MARCIANO presets.
    const isInternal = tenantId.startsWith('lojacond');
    const sourceTiles = isInternal ? COCKPIT_TILES : MARCIANO_TILES;
    const sourceSalas = isInternal ? SALAS_PADRAO : MARCIANO_SALAS;

    // 1. Filter tiles based on RBAC
    const userAllowedTiles = sourceTiles.filter((tile) => {
        // If no roles specified, it's public (or broadly internal)
        if (!tile.required.roles || tile.required.roles.length === 0) {
            return true;
        }

        // Check if user's role intersects with required ones
        return tile.required.roles.includes(role);
    });

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
