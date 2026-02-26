'use client';

import { createContext, useContext, ReactNode } from 'react';

export type Role = 'admin' | 'manager' | 'viewer';
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
            return ctx.role === 'manager'; // Only admin (handled above) or manager can access audit
        case 'settings':
            return false; // Only admin can access settings
        default:
            return false;
    }
}

export const EntitlementContext = createContext<UserContextData | null>(null);

export function EntitlementProvider({
    children,
    value,
}: {
    children: ReactNode;
    value: UserContextData;
}) {
    return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlements() {
    const ctx = useContext(EntitlementContext);
    if (!ctx) {
        throw new Error('useEntitlements must be used within an EntitlementProvider');
    }
    return ctx;
}
