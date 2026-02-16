import { NextRequest } from 'next/server';
import type { TenantRecord } from '../../drizzle/schema';
import { tenantRepository } from '../repositories/tenant.repository';
import { BusinessError, ErrorCode } from '../errors';

export interface AuthenticatedContext {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
    tenant: TenantRecord;
}

export async function getTenantContext(request: NextRequest): Promise<AuthenticatedContext> {
    const userId = request.headers.get('x-user-id');
    const email = request.headers.get('x-user-email');
    const tenantId = request.headers.get('x-tenant-id');
    const role = request.headers.get('x-user-role');

    if (!userId || !tenantId) {
        throw new BusinessError(
            ErrorCode.UNAUTHORIZED,
            'Missing auth context'
        );
    }

    const tenant = await tenantRepository.getTenantById(tenantId);
    if (!tenant) {
        throw new BusinessError(
            ErrorCode.UNAUTHORIZED,
            `Tenant ${tenantId} not found`
        );
    }

    return { userId, email: email!, tenantId, role: role!, tenant };
}
