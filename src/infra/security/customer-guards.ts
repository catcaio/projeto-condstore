import { customerAccountsRepository } from '@/infra/repositories/customer-accounts.repository';
import { InfrastructureError, ErrorCode } from '@/infra/errors';

export interface CustomerAuthSession {
    tenantId: string | null;
    userId?: string;
}

export async function requireOrganizationAccess(session: CustomerAuthSession | null, organizationId: string): Promise<void> {
    if (!session || !session.tenantId || !session.userId) {
        throw new InfrastructureError(ErrorCode.UNAUTHORIZED, 'Missing active session or tenant context', { isRetryable: false });
    }

    const hasAccess = await customerAccountsRepository.getByUserIdAndOrganizationId(
        session.tenantId,
        session.userId,
        organizationId
    );

    if (!hasAccess) {
        throw new InfrastructureError(ErrorCode.FORBIDDEN, 'User does not have access to the requested organization', { isRetryable: false });
    }
}
