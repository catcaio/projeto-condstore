import { NextRequest } from 'next/server';
import type { TenantRecord } from '../../drizzle/schema';
import { tenantRepository } from '../repositories/tenant.repository';
import { BusinessError, ErrorCode } from '../errors';
import { getSessionUser } from './session';

export interface AuthenticatedContext {
    userId: string;
    tenantId: string;
    role: string;
    tenant: TenantRecord;
}

/**
 * Derives auth context directly from the verified JWT session cookie.
 * Does NOT trust any x-user-* headers.
 */
export async function getTenantContext(request: NextRequest): Promise<AuthenticatedContext> {
    const session = await getSessionUser(request);

    if (!session || !session.sub || !session.tenantId) {
        throw new BusinessError(
            ErrorCode.UNAUTHORIZED,
            'Missing auth context'
        );
    }

    const tenant = await tenantRepository.getTenantById(session.tenantId);
    if (!tenant) {
        throw new BusinessError(
            ErrorCode.UNAUTHORIZED,
            `Tenant ${session.tenantId} not found`
        );
    }

    return {
        userId: session.sub,
        tenantId: session.tenantId,
        role: session.role,
        tenant,
    };
}
