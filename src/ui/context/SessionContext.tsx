'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Role } from '@/ui/auth/entitlements-logic';

export interface SessionData {
    userId: string;
    tenantId: string;
    role: Role;
    hasActivePlan: boolean;
}

const SessionContext = createContext<SessionData | null>(null);

export function SessionProvider({
    children,
    value,
}: {
    children: ReactNode;
    value: SessionData;
}) {
    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionData {
    const ctx = useContext(SessionContext);
    if (!ctx) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return ctx;
}
