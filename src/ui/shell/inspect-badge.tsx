'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/ui/components';
import { type Role, isSuperAdmin } from '@/ui/auth/entitlements-logic';

export function InspectBadge({ role }: { role: Role | string }) {
    const searchParams = useSearchParams();
    const isSuper = isSuperAdmin(role);
    const inspectTenantId = searchParams.get('tenantId');

    if (!isSuper || !inspectTenantId) {
        return null;
    }

    return (
        <Badge variant="danger">
            INSPECTING: {inspectTenantId}
        </Badge>
    );
}
