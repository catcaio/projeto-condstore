// Server-safe entitlement logic — NO 'use client' directive.
// Import this in Server Components (pages, layouts) for entitlement checks.
// For client-side hooks/context, import from entitlements.tsx.

export type Role = 'admin' | 'operator' | 'manager' | 'viewer';
export type Entitlement = 'plan:active' | 'rbac:admin_only' | 'rbac:viewer_or_higher';
export type Module = 'cockpit' | 'acquisition' | 'audit' | 'frete' | 'settings';

export interface UserContextData {
    role: Role;
    hasActivePlan: boolean;
}

export function canAccess(module: Module, ctx: UserContextData): boolean {
    if (ctx.role === 'admin') return true;

    switch (module) {
        case 'cockpit':
        case 'acquisition':
        case 'frete':
            return ctx.hasActivePlan;
        case 'audit':
            // admin (above), manager, or operator can access audit
            return ctx.role === 'manager' || ctx.role === 'operator';
        case 'settings':
            return false; // Only admin can access settings
        default:
            return false;
    }
}
