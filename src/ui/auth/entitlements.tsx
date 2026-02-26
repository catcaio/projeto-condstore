'use client';

import { createContext, useContext, ReactNode } from 'react';
export type { Role, Entitlement, Module, UserContextData } from './entitlements-logic';
export { canAccess } from './entitlements-logic';
import type { UserContextData } from './entitlements-logic';

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
