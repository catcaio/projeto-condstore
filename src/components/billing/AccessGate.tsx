"use client";

import React, { useEffect, useState, ReactNode } from 'react';
import { getOrCreateClientUserId } from '../../lib/billing/clientUserId';
import { fetchSubscription } from '../../lib/billing/getSubscription';
import { Card } from '../../../ui/primitives/Card';
import { Button } from '../../../ui/primitives/Button';
import { Stack } from '../../../ui/primitives/Stack';

interface AccessGateProps {
    requiredLayer: 'premium' | 'pro' | 'basic';
    fallback?: ReactNode;
    children: ReactNode;
}

// In-memory cache to avoid repeated calls within the same session
let cachedAccessResult: boolean | null = null;
let lastCheckTime: number = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export const AccessGate = ({ requiredLayer, fallback, children }: AccessGateProps) => {
    const [isAllowed, setIsAllowed] = useState<boolean | null>(cachedAccessResult);
    const [isChecking, setIsChecking] = useState<boolean>(cachedAccessResult === null);

    useEffect(() => {
        const verifyAccess = async () => {
            const getCookieValue = (name: string) => (
                document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || null
            );

            const entitledCookie = getCookieValue('entitled');

            if (entitledCookie === '1') {
                cachedAccessResult = true;
                setIsAllowed(true);
                setIsChecking(false);
                return;
            } else if (entitledCookie === '0') {
                // If explicitly 0 and TTL is fresh, we can fast fail, but generally 
                // we might want to re-check if they just upgraded. Let's do TTL check.
            }

            if (cachedAccessResult !== null && (Date.now() - lastCheckTime) < CACHE_TTL) {
                setIsAllowed(cachedAccessResult);
                setIsChecking(false);
                return;
            }

            const userId = getOrCreateClientUserId();
            const sub = await fetchSubscription(userId); // This sets the cookie securely via API response

            let allowed = false;

            if (sub && !('status' in sub && sub.status === 'none') && ('planId' in sub)) {
                const active = ['active', 'trialing'].includes(sub.status);

                if (active) {
                    const hierarchy = { basic: 1, premium: 2, pro: 3 };
                    const userLevel = hierarchy[sub.planId as keyof typeof hierarchy] || 0;
                    const requiredLevel = hierarchy[requiredLayer as keyof typeof hierarchy] || 99;

                    if (userLevel >= requiredLevel) {
                        allowed = true;
                    }
                }
            }

            cachedAccessResult = allowed;
            lastCheckTime = Date.now();

            setIsAllowed(allowed);
            setIsChecking(false);
        };

        if (cachedAccessResult === null || (Date.now() - lastCheckTime) >= CACHE_TTL) {
            verifyAccess();
        }
    }, [requiredLayer]);

    if (isChecking) {
        return (
            <div className="w-full flex justify-center py-8">
                <div className="animate-pulse flex gap-2 w-full max-w-sm">
                    <div className="h-6 w-full bg-[var(--surface-muted)] rounded"></div>
                </div>
            </div>
        );
    }

    if (isAllowed) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <Card variant="default" className="border-red-100 bg-red-50">
            <Stack space={16}>
                <div>
                    <h3 className="text-red-800 font-bold text-[var(--text-base)] mb-1">Recurso Exclusivo</h3>
                    <p className="text-red-700 text-[var(--text-base)]">
                        Seu plano atual não oferece acesso a esta funcionalidade. Faça upgrade para o plano <span className="capitalize font-semibold">{requiredLayer}</span> para desbloquear.
                    </p>
                </div>
                <Button
                    variant="primary"
                    className="h-[56px] w-full justify-center bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => window.location.href = '/pricing'}
                >
                    Fazer upgrade
                </Button>
            </Stack>
        </Card>
    );
};
