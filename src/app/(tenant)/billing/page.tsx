"use client";

import React, { useEffect, useState } from 'react';
import { getOrCreateClientUserId } from '@/lib/billing/clientUserId';
import { fetchSubscription } from '@/lib/billing/getSubscription';
import { SubscriptionRecord } from '@/lib/billing/types';
import { BillingStatusCard } from '@/components/billing/BillingStatusCard';
import { track } from '../../../../utils/track';
import { Section } from '../../../../ui/primitives/Section';

export default function BillingPage() {
    const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        track("billing_view");

        const loadData = async () => {
            const userId = getOrCreateClientUserId();
            const data = await fetchSubscription(userId);

            if ('status' in data && data.status !== 'none' && 'planId' in data) {
                setSubscription(data as SubscriptionRecord);
            } else {
                setSubscription(null);
            }

            setIsLoading(false);
        };

        loadData();
    }, []);

    return (
        <div className="min-h-screen bg-[var(--surface-base)] pb-[env(safe-area-inset-bottom,24px)]">
            <Section>
                <div className="pt-8 pb-4">
                    <h1 className="text-[var(--text-hero)] font-bold text-[var(--brand-black)] leading-tight tracking-tight mb-2">
                        Assinatura
                    </h1>
                    <p className="text-[var(--text-secondary)] text-[var(--text-muted)]">
                        Gerencie seu plano atual e verifique o status de acesso.
                    </p>
                </div>

                <div className="mt-6">
                    <BillingStatusCard
                        subscription={subscription}
                        isLoading={isLoading}
                    />
                </div>
            </Section>
        </div>
    );
}
