// Server-safe entitlement logic — NO 'use client' directive.
// Import this in Server Components (pages, layouts) for entitlement checks.
// For client-side hooks/context, import from entitlements.tsx.

export type Role = 'admin' | 'operator' | 'manager' | 'viewer';
export type Entitlement = 'plan:active' | 'rbac:admin_only' | 'rbac:viewer_or_higher';
export type Module = 'cockpit' | 'acquisition' | 'audit' | 'frete' | 'settings' | 'dispatch' | 'admin' | 'operation';

export interface UserContextData {
    role: Role | string;
    hasActivePlan: boolean;
}

export function isSuperAdmin(role?: string | null): boolean {
    return role === 'super_admin';
}

export function canAccess(module: Module, ctx: UserContextData): boolean {
    if (ctx.role === 'admin') return true;

    switch (module) {
        case 'cockpit':
        case 'acquisition':
        case 'frete':
        case 'dispatch':
        case 'operation':
            return ctx.hasActivePlan;
        case 'audit':
            // admin (above), manager, or operator can access audit
            return ctx.role === 'manager' || ctx.role === 'operator';
        case 'settings':
        case 'admin':
            return false; // Only admin can access admin/settings
        default:
            return false;
    }
}
