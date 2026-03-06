import { structuredLogger } from '@/infra/log/logger';
import { tenantSupremePermissionsRepository } from '@/infra/repositories/tenant-supreme-permissions.repository';

// ── Scopes ────────────────────────────────────────────────────────────────────

export type SupremePermissionScope =
    | 'READ_METRICS'
    | 'GENERATE_RECOMMENDATIONS'
    | 'EXECUTE_OPTIMIZATIONS'
    | 'ADS_BUDGET'
    | 'CRM_ACTION'
    | 'WHATSAPP_AUTOMATION';

// ── Errors ────────────────────────────────────────────────────────────────────

export class SupremeForbiddenError extends Error {
    public readonly tenantId: string;
    public readonly scope: SupremePermissionScope;

    constructor(tenantId: string, scope: SupremePermissionScope) {
        super(`Tenant ${tenantId} is not authorized to perform FRANK SUPREMO scope: ${scope}`);
        this.name = 'SupremeForbiddenError';
        this.tenantId = tenantId;
        this.scope = scope;
    }
}

// ── Scope → field mapping ─────────────────────────────────────────────────────

type PermissionsKey =
    | 'allowReadMetrics'
    | 'allowGenerateRecommendations'
    | 'allowExecuteOptimizations'
    | 'allowAdsBudgetChanges'
    | 'allowCrmActions'
    | 'allowWhatsappAutomation';

const SCOPE_TO_FIELD: Record<SupremePermissionScope, PermissionsKey> = {
    READ_METRICS: 'allowReadMetrics',
    GENERATE_RECOMMENDATIONS: 'allowGenerateRecommendations',
    EXECUTE_OPTIMIZATIONS: 'allowExecuteOptimizations',
    ADS_BUDGET: 'allowAdsBudgetChanges',
    CRM_ACTION: 'allowCrmActions',
    WHATSAPP_AUTOMATION: 'allowWhatsappAutomation',
};

// ── assertSupremePermission ───────────────────────────────────────────────────

/**
 * Asserts that the given tenant is authorized to execute the given FRANK SUPREMO scope.
 * Throws SupremeForbiddenError if the permission is disabled.
 */
export async function assertSupremePermission(
    tenantId: string,
    scope: SupremePermissionScope,
): Promise<void> {
    const permissions = await tenantSupremePermissionsRepository.getTenantSupremePermissions(tenantId);
    const field = SCOPE_TO_FIELD[scope];
    const allowed = permissions[field];

    if (!allowed) {
        structuredLogger.warn('supreme_permission_denied', {
            tenantId,
            scope,
            eventType: 'supreme_permission_denied',
        });
        throw new SupremeForbiddenError(tenantId, scope);
    }

    structuredLogger.info('supreme_permission_granted', {
        tenantId,
        scope,
        eventType: 'supreme_permission_granted',
    });
}
