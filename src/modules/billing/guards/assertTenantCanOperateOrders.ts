import { eq } from 'drizzle-orm';
import { tenants } from '@/drizzle/schema';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';

type BillingDb = Awaited<ReturnType<typeof getDb>>;

export const ORDER_OPERATION_ALLOWED_PLAN_STATUSES = ['active', 'trialing'] as const;

type OrderOperationAllowedPlanStatus = (typeof ORDER_OPERATION_ALLOWED_PLAN_STATUSES)[number];

export class OrderBillingRequiredError extends Error {
    readonly code = 'ORDER_BILLING_PAYMENT_REQUIRED';
    readonly statusCode = 402;

    constructor(
        public readonly tenantId: string,
        public readonly planStatus: string | null,
    ) {
        super(
            `Tenant subscription status '${planStatus ?? 'none'}' does not allow order creation or confirmation.`,
        );
        this.name = 'OrderBillingRequiredError';
    }
}

export function isOrderBillingRequiredError(error: unknown): error is OrderBillingRequiredError {
    return (
        error instanceof OrderBillingRequiredError ||
        (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code?: string }).code === 'ORDER_BILLING_PAYMENT_REQUIRED')
    );
}

function isOrderOperationAllowedPlanStatus(
    planStatus: string | null | undefined,
): planStatus is OrderOperationAllowedPlanStatus {
    return ORDER_OPERATION_ALLOWED_PLAN_STATUSES.includes(
        planStatus as OrderOperationAllowedPlanStatus,
    );
}

export async function assertTenantCanOperateOrders(
    tenantId: string,
    db?: BillingDb,
): Promise<void> {
    const connection = db ?? await getDb();
    const [tenant] = await connection
        .select({ planStatus: tenants.planStatus })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

    if (!tenant) {
        throw new Error('Tenant not found');
    }

    if (isOrderOperationAllowedPlanStatus(tenant.planStatus)) {
        return;
    }

    logger.warn('order_operation_blocked_by_billing', {
        tenantId,
        planStatus: tenant.planStatus,
        allowedStatuses: ORDER_OPERATION_ALLOWED_PLAN_STATUSES,
    });

    throw new OrderBillingRequiredError(tenantId, tenant.planStatus);
}
