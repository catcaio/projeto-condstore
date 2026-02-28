import { isRole, type Role } from '../../infra/auth/roles';
import { type NextRequest } from 'next/server';
import { requireSession, type GuardResult } from '../../infra/auth/guards';
import { ErrorCode, errorResponse } from '../../infra/http/error-response';

export type KnowledgePermission =
    | 'knowledge:read'
    | 'knowledge:upload'
    | 'knowledge:manage'
    | 'knowledge:reprocess'
    | 'knowledge:delete'
    | 'knowledge:mark_sensitive'
    | 'knowledge:audit_read'
    | 'knowledge:ask';

// Map roles to permissions
const rolePermissions: Record<Role, KnowledgePermission[]> = {
    admin: [
        'knowledge:read',
        'knowledge:upload',
        'knowledge:manage',
        'knowledge:reprocess',
        'knowledge:delete',
        'knowledge:mark_sensitive',
        'knowledge:audit_read',
        'knowledge:ask',
    ],
    manager: [
        'knowledge:read',
        'knowledge:upload',
        'knowledge:manage',
        'knowledge:reprocess',
        'knowledge:ask',
    ], // no delete, maybe no mark_sensitive
    operator: [
        'knowledge:read',
        'knowledge:upload',
        'knowledge:ask',
    ], // equivalent to requested 'agent' role
    viewer: [
        'knowledge:read',
        'knowledge:ask',
    ],
};

export function hasKnowledgePermission(role: Role, permission: KnowledgePermission): boolean {
    return rolePermissions[role]?.includes(permission) ?? false;
}

export async function requireKnowledgePermission(
    request: NextRequest,
    permission: KnowledgePermission,
    options?: { requestId?: string }
): Promise<GuardResult> {
    const sessionResult = await requireSession(request, options);
    if (!sessionResult.ok) {
        return sessionResult;
    }

    const role = sessionResult.session.role;
    if (!hasKnowledgePermission(role, permission)) {
        return {
            ok: false,
            code: ErrorCode.FORBIDDEN,
            requestId: sessionResult.requestId,
            response: errorResponse(
                ErrorCode.FORBIDDEN,
                403,
                sessionResult.requestId,
                'Forbidden: Insufficient knowledge permissions.'
            ),
        };
    }

    return sessionResult;
}
